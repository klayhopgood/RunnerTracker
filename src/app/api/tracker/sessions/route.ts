import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateDevice } from "@/lib/device-auth";
import { buildSessionInsert, createSessionSchema } from "@/lib/session-create";

export const dynamic = "force-dynamic";

const SESSION_FIELDS =
  "id, slug, display_name, visibility, status, units, countdown_seconds, countdown_ends_at, auto_stop_minutes, started_at, distance_meters, elevation_gain_meters, duration_seconds, created_at";

/**
 * Create a session from the paired phone (device token, no auth cookies) —
 * the tracker's quick-start flow. Same validation rules as /api/sessions.
 */
export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
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

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("sessions")
    .insert(await buildSessionInsert(device.user_id, parsed.data))
    .select(SESSION_FIELDS)
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: "Could not create session" },
      { status: 500 }
    );
  }
  return NextResponse.json({ session });
}

/** Sessions the paired phone can run — draft plus anything already active. */
export async function GET(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select(SESSION_FIELDS)
    .eq("user_id", device.user_id)
    .in("status", ["draft", "countdown", "live"])
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    deviceName: device.name,
    sessions: sessions ?? [],
  });
}
