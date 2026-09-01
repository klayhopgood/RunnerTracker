import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateDevice } from "@/lib/device-auth";
import { correctElevation } from "@/lib/elevation";
import { haversineMeters } from "@/lib/geo";
import { broadcast, PUBLIC_LIVE_CHANNEL, trackChannel } from "@/lib/realtime";

const MAX_ACCURACY_M = 50;
const ELEVATION_GAIN_THRESHOLD_M = 3;

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        altitude: z.number().nullable().optional(),
        accuracy: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
        heading: z.number().nullable().optional(),
        recordedAt: z.string().datetime(),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { sessionId, points } = parsed.data;

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, user_id, slug, display_name, visibility, status, countdown_ends_at, started_at, auto_stop_minutes, distance_meters, elevation_gain_meters"
    )
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== device.user_id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const now = Date.now();
  const topics =
    session.visibility === "public"
      ? [PUBLIC_LIVE_CHANNEL, trackChannel(session.slug)]
      : [trackChannel(session.slug)];

  // Countdown → live transition happens on the first ping past the deadline.
  if (session.status === "countdown") {
    const endsAt = session.countdown_ends_at
      ? new Date(session.countdown_ends_at).getTime()
      : 0;
    if (now < endsAt) {
      return NextResponse.json({
        status: "countdown",
        secondsRemaining: Math.ceil((endsAt - now) / 1000),
      });
    }
    await admin
      .from("sessions")
      .update({ status: "live" })
      .eq("id", session.id);
    session.status = "live";
  }

  if (session.status !== "live") {
    return NextResponse.json(
      { status: session.status, error: "Session is not live" },
      { status: 409 }
    );
  }

  // Auto-stop if the configured window has elapsed.
  if (session.auto_stop_minutes && session.started_at) {
    const stopAt =
      new Date(session.started_at).getTime() +
      session.auto_stop_minutes * 60 * 1000;
    if (now >= stopAt) {
      const durationSeconds = Math.floor(
        (stopAt - new Date(session.started_at).getTime()) / 1000
      );
      await admin
        .from("sessions")
        .update({
          status: "stopped",
          ended_at: new Date(stopAt).toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", session.id);
      await broadcast(topics, "session_stopped", {
        sessionId: session.id,
        slug: session.slug,
        status: "stopped",
      });
      return NextResponse.json({ status: "stopped", reason: "auto_stop" });
    }
  }

  const usable = points
    .filter((p) => p.accuracy == null || p.accuracy <= MAX_ACCURACY_M)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

  if (usable.length === 0) {
    return NextResponse.json({ status: "live", accepted: 0 });
  }

  const { data: lastStored } = await admin
    .from("track_points")
    .select("lat, lng, altitude_corrected, recorded_at")
    .eq("session_id", session.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let prevLat = lastStored?.lat ?? null;
  let prevLng = lastStored?.lng ?? null;
  let prevElev = lastStored?.altitude_corrected ?? null;
  let addedDistance = 0;
  let addedGain = 0;

  const rows = [];
  for (const p of usable) {
    const corrected = await correctElevation({
      lat: p.lat,
      lng: p.lng,
      altitudeRaw: p.altitude,
    });
    const elev = corrected?.elevationMeters ?? null;

    if (prevLat !== null && prevLng !== null) {
      addedDistance += haversineMeters(prevLat, prevLng, p.lat, p.lng);
    }
    if (prevElev !== null && elev !== null) {
      const delta = elev - prevElev;
      if (delta > ELEVATION_GAIN_THRESHOLD_M) addedGain += delta;
    }

    rows.push({
      session_id: session.id,
      lat: p.lat,
      lng: p.lng,
      altitude_raw: p.altitude ?? null,
      altitude_corrected: elev,
      accuracy: p.accuracy ?? null,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      recorded_at: p.recordedAt,
    });

    prevLat = p.lat;
    prevLng = p.lng;
    if (elev !== null) prevElev = elev;
  }

  const { error: insertError } = await admin.from("track_points").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: "Could not store points" }, { status: 500 });
  }

  const last = usable[usable.length - 1]!;
  const lastRow = rows[rows.length - 1]!;
  const distanceMeters = session.distance_meters + addedDistance;
  const elevationGainMeters = session.elevation_gain_meters + addedGain;
  const durationSeconds = session.started_at
    ? Math.max(
        0,
        Math.floor(
          (new Date(last.recordedAt).getTime() -
            new Date(session.started_at).getTime()) /
            1000
        )
      )
    : 0;

  await Promise.all([
    admin
      .from("sessions")
      .update({
        distance_meters: distanceMeters,
        elevation_gain_meters: elevationGainMeters,
        duration_seconds: durationSeconds,
      })
      .eq("id", session.id),
    admin
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id),
    broadcast(topics, "location_update", {
      sessionId: session.id,
      slug: session.slug,
      displayName: session.display_name,
      lat: last.lat,
      lng: last.lng,
      elevation: lastRow.altitude_corrected,
      speed: last.speed ?? null,
      heading: last.heading ?? null,
      distanceMeters,
      elevationGainMeters,
      durationSeconds,
      recordedAt: last.recordedAt,
      status: "live",
    }),
  ]);

  return NextResponse.json({
    status: "live",
    accepted: rows.length,
    distanceMeters,
    elevationGainMeters,
    durationSeconds,
  });
}
