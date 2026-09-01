import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** How many runners are tracking right now, public or private. */
export async function GET() {
  const admin = createAdminClient();
  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .in("status", ["live", "countdown"]);

  return NextResponse.json({ count: count ?? 0 });
}
