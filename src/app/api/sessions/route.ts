import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSessionInsert, createSessionSchema } from "@/lib/session-create";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSessionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert(await buildSessionInsert(user.id, parsed.data))
    .select("id, slug, display_name, visibility, status, created_at")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: "Could not create session" },
      { status: 500 }
    );
  }
  return NextResponse.json({ session });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, slug, display_name, visibility, status, units, countdown_seconds, auto_stop_minutes, started_at, ended_at, distance_meters, elevation_gain_meters, duration_seconds, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ sessions: sessions ?? [] });
}
