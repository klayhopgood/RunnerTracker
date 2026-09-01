import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateDevice } from "@/lib/device-auth";
import { broadcast, PUBLIC_LIVE_CHANNEL, trackChannel } from "@/lib/realtime";

/** Owner can start from the dashboard; the paired phone starts with its device token. */
async function resolveActor(request: Request): Promise<{
  userId: string;
  deviceId: string | null;
} | null> {
  const device = await authenticateDevice(request);
  if (device) return { userId: device.user_id, deviceId: device.id };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { userId: user.id, deviceId: null };
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await resolveActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, slug, display_name, visibility, status, countdown_seconds")
    .eq("id", id)
    .single();

  if (!session || session.user_id !== actor.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "draft") {
    return NextResponse.json(
      { error: `Session already ${session.status}` },
      { status: 409 }
    );
  }

  const { data: activeSessions } = await admin
    .from("sessions")
    .select("id")
    .eq("user_id", actor.userId)
    .in("status", ["countdown", "live"]);
  if ((activeSessions ?? []).length > 0) {
    return NextResponse.json(
      { error: "You already have an active session — stop it first" },
      { status: 409 }
    );
  }

  const now = Date.now();
  const countdownMs = session.countdown_seconds * 1000;
  const goesLiveAt = new Date(now + countdownMs).toISOString();
  const status = countdownMs > 0 ? "countdown" : "live";

  const { error } = await admin
    .from("sessions")
    .update({
      status,
      countdown_ends_at: countdownMs > 0 ? goesLiveAt : null,
      started_at: goesLiveAt,
      device_id: actor.deviceId,
    })
    .eq("id", session.id);

  if (error) {
    return NextResponse.json({ error: "Start failed" }, { status: 500 });
  }

  if (session.visibility === "public") {
    await broadcast(
      [PUBLIC_LIVE_CHANNEL, trackChannel(session.slug)],
      "session_started",
      {
        sessionId: session.id,
        slug: session.slug,
        displayName: session.display_name,
        status,
        startedAt: goesLiveAt,
      }
    );
  }

  return NextResponse.json({ status, startsAt: goesLiveAt });
}
