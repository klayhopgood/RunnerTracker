import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeviceSecret, hashDeviceSecret } from "@/lib/device-auth";

const bodySchema = z.object({
  name: z.string().min(1).max(80).default("This phone"),
  platform: z.enum(["ios", "android", "web"]).default("web"),
});

/**
 * One-tap pairing for the device the user is currently logged in on —
 * no code needed, authenticated by the Supabase session cookie.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const secret = generateDeviceSecret();
  const admin = createAdminClient();
  const { data: device, error } = await admin
    .from("devices")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      platform: parsed.data.platform,
      device_token_hash: hashDeviceSecret(secret),
    })
    .select("id")
    .single();

  if (error || !device) {
    return NextResponse.json({ error: "Pairing failed" }, { status: 500 });
  }

  // The raw secret is returned exactly once; only its hash is stored.
  return NextResponse.json({
    deviceId: device.id,
    deviceToken: `${device.id}.${secret}`,
  });
}
