import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { downsample } from "@/lib/geo";
import { isValidViewerCookie, viewerCookieName } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";

const MAX_TRAIL_POINTS = 1000;

/** Trail as [lng, lat, elevation] triples, downsampled for rendering. */
export async function GET(
  request: NextRequest,
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
    const cookie = request.cookies.get(viewerCookieName(slug))?.value;
    let allowed = isValidViewerCookie(slug, cookie);
    if (!allowed) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      allowed = !!user && user.id === session.user_id;
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "Password required", needsPassword: true },
        { status: 401 }
      );
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
