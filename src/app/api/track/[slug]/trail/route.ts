import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { downsample } from "@/lib/geo";

export const dynamic = "force-dynamic";

const MAX_TRAIL_POINTS = 1000;

/** Trail as [lng, lat, elevation] triples, downsampled for rendering. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, visibility, status")
    .eq("slug", slug)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.visibility === "private") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== session.user_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const { data: points } = await admin
    .from("track_points")
    .select("lat, lng, altitude_corrected, recorded_at")
    .eq("session_id", session.id)
    .order("recorded_at", { ascending: true })
    .limit(20000);

  const coordinates = downsample(points ?? [], MAX_TRAIL_POINTS).map((p) => [
    p.lng,
    p.lat,
    p.altitude_corrected ?? 0,
  ]);

  return NextResponse.json({ coordinates });
}
