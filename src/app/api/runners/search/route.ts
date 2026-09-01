import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Find a runner by display name.
 * - public live run → their location + slug so the map can zoom in
 * - private live run → status only, no location
 * - otherwise → inactive
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Enter at least 2 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .ilike("display_name", `%${name.replace(/[%_]/g, "")}%`)
    .limit(10);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Prefer an exact (case-insensitive) match, otherwise the first hit.
  const profile =
    profiles.find(
      (p) => p.display_name.toLowerCase() === name.toLowerCase()
    ) ?? profiles[0]!;

  const { data: session } = await admin
    .from("sessions")
    .select("id, slug, visibility, status")
    .eq("user_id", profile.id)
    .in("status", ["live", "countdown"])
    .maybeSingle();

  if (!session) {
    return NextResponse.json({
      found: true,
      displayName: profile.display_name,
      status: "inactive",
    });
  }

  if (session.visibility === "private") {
    return NextResponse.json({
      found: true,
      displayName: profile.display_name,
      status: "private",
    });
  }

  const { data: point } = await admin
    .from("track_points")
    .select("lat, lng")
    .eq("session_id", session.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    found: true,
    displayName: profile.display_name,
    status: "public",
    slug: session.slug,
    location: point ? { lat: point.lat, lng: point.lng } : null,
  });
}
