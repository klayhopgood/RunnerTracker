import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: devices } = await supabase
    .from("devices")
    .select("id, name, platform, paired_at, last_seen_at")
    .is("revoked_at", null)
    .order("paired_at", { ascending: false });

  return NextResponse.json({ devices: devices ?? [] });
}
