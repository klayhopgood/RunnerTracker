import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidViewerCookie, viewerCookieName } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";

async function canViewPrivate(
  request: NextRequest,
  slug: string,
  ownerId: string
): Promise<boolean> {
  const cookie = request.cookies.get(viewerCookieName(slug))?.value;
  if (isValidViewerCookie(slug, cookie)) return true;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && user.id === ownerId;
}

/** Session details for the viewer page. Private runs need the owner login or a viewer cookie. */
export async function GET(
  request: NextRequest,
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
    const allowed = await canViewPrivate(request, slug, session.user_id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Password required", needsPassword: true },
        { status: 401 }
      );
    }
  }

  const { user_id: _userId, ...publicSession } = session;
  return NextResponse.json({ session: publicSession });
}
