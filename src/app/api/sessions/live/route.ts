import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public live sessions with their latest position, for bootstrapping the homepage map. */
export async function GET() {
  const admin = createAdminClient();

  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, slug, display_name, status, units, started_at, distance_meters, elevation_gain_meters, duration_seconds"
    )
    .eq("visibility", "public")
    .in("status", ["countdown", "live"])
    .order("started_at", { ascending: false })
    .limit(100);

  const result = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const { data: point } = await admin
        .from("track_points")
        .select("lat, lng, altitude_corrected, speed, heading, recorded_at")
        .eq("session_id", session.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        sessionId: session.id,
        slug: session.slug,
        displayName: session.display_name,
        status: session.status,
        units: session.units,
        startedAt: session.started_at,
        distanceMeters: session.distance_meters,
        elevationGainMeters: session.elevation_gain_meters,
        durationSeconds: session.duration_seconds,
        lastPoint: point
          ? {
              lat: point.lat,
              lng: point.lng,
              elevation: point.altitude_corrected,
              speed: point.speed,
              heading: point.heading,
              recordedAt: point.recorded_at,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ sessions: result });
}
