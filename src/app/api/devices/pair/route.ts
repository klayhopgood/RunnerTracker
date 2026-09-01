import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeviceSecret, hashDeviceSecret } from "@/lib/device-auth";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).max(80).default("My phone"),
  platform: z.enum(["ios", "android", "web"]).default("web"),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { code, name, platform } = parsed.data;

  const admin = createAdminClient();
  const { data: pairing } = await admin
    .from("pairing_codes")
    .select("code, user_id, expires_at, used_at")
    .eq("code", code)
    .single();

  if (
    !pairing ||
    pairing.used_at ||
    new Date(pairing.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 400 }
    );
  }

  const secret = generateDeviceSecret();
  const { data: device, error } = await admin
    .from("devices")
    .insert({
      user_id: pairing.user_id,
      name,
      platform,
      device_token_hash: hashDeviceSecret(secret),
    })
    .select("id")
    .single();

  if (error || !device) {
    return NextResponse.json({ error: "Pairing failed" }, { status: 500 });
  }

  await admin
    .from("pairing_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", pairing.user_id)
    .single();

  // The raw secret is returned exactly once; only its hash is stored.
  return NextResponse.json({
    deviceId: device.id,
    deviceToken: `${device.id}.${secret}`,
    ownerName: profile?.display_name ?? "Runner",
  });
}
