import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Session details for the viewer page. Private sessions are owner-only until Phase 3's password flow. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, user_id, slug, display_name, visibility, status, units, started_at, ended_at, distance_meters, elevation_gain_meters, duration_seconds"
    )
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

  const { user_id: _userId, ...publicSession } = session;
  return NextResponse.json({ session: publicSession });
}
