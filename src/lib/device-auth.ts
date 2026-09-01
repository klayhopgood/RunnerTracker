import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeviceRow = {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  device_token_hash: string;
  revoked_at: string | null;
};

export function generateDeviceSecret(): string {
  return randomBytes(24).toString("hex");
}

export function hashDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Authenticates a phone via `Authorization: Bearer <deviceId>.<secret>`.
 * Returns the device row, or null if the token is missing/invalid/revoked.
 */
export async function authenticateDevice(
  request: Request
): Promise<DeviceRow | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;

  const deviceId = token.slice(0, dotIdx);
  const secret = token.slice(dotIdx + 1);
  if (!deviceId || !secret) return null;

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("devices")
    .select("id, user_id, name, platform, device_token_hash, revoked_at")
    .eq("id", deviceId)
    .single();

  if (!device || device.revoked_at) return null;
  if (device.device_token_hash !== hashDeviceSecret(secret)) return null;

  return device as DeviceRow;
}
