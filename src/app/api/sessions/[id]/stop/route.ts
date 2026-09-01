import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateDevice } from "@/lib/device-auth";
import { broadcast, PUBLIC_LIVE_CHANNEL, trackChannel } from "@/lib/realtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  const device = await authenticateDevice(request);
  if (device) {
    userId = device.user_id;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, slug, display_name, visibility, status, started_at")
    .eq("id", id)
    .single();

  if (!session || session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "live" && session.status !== "countdown") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  const endedAt = new Date();
  const durationSeconds = session.started_at
    ? Math.max(
        0,
        Math.floor((endedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
      )
    : 0;

  const { error } = await admin
    .from("sessions")
    .update({
      status: "stopped",
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", session.id);

  if (error) {
    return NextResponse.json({ error: "Stop failed" }, { status: 500 });
  }

  if (session.visibility === "public") {
    await broadcast(
      [PUBLIC_LIVE_CHANNEL, trackChannel(session.slug)],
      "session_stopped",
      { sessionId: session.id, slug: session.slug, status: "stopped" }
    );
  }

  return NextResponse.json({ status: "stopped", durationSeconds });
}
