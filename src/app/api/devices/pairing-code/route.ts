import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_TTL_MS = 5 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const admin = createAdminClient();
  // One active code per user — replace any previous ones.
  await admin.from("pairing_codes").delete().eq("user_id", user.id);
  const { error } = await admin
    .from("pairing_codes")
    .insert({ code, user_id: user.id, expires_at: expiresAt });

  if (error) {
    return NextResponse.json(
      { error: "Could not create pairing code" },
      { status: 500 }
    );
  }

  return NextResponse.json({ code, expiresAt });
}
