import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateDevice } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

/** Sessions the paired phone can run — draft plus anything already active. */
export async function GET(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, slug, display_name, visibility, status, units, countdown_seconds, countdown_ends_at, auto_stop_minutes, started_at, distance_meters, elevation_gain_meters, duration_seconds, created_at"
    )
    .eq("user_id", device.user_id)
    .in("status", ["draft", "countdown", "live"])
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    deviceName: device.name,
    sessions: sessions ?? [],
  });
}
