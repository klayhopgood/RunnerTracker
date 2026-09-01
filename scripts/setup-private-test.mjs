/* Creates a temp user with a LIVE PRIVATE session (password: "letmein") for manual verification.
   Prints the slug. Clean up with: node scripts/cleanup-test-users.mjs */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const h = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const user = await (
  await fetch(`${SB}/auth/v1/admin/users`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      email: `e2e-smoke-private-${Date.now()}@example.com`,
      password: "smoke-test-pass-123",
      email_confirm: true,
      user_metadata: { display_name: "Casey Private" },
    }),
  })
).json();

const slug = `e2e-priv-${Date.now().toString(36)}`;
const [session] = await (
  await fetch(`${SB}/rest/v1/sessions`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      user_id: user.id,
      slug,
      display_name: "Casey's secret run",
      visibility: "private",
      viewer_password_hash: await bcrypt.hash("letmein", 10),
      status: "live",
      started_at: new Date(Date.now() - 300000).toISOString(),
      distance_meters: 1234,
      duration_seconds: 300,
    }),
  })
).json();

const base = { lat: -33.865, lng: 151.21 };
const points = Array.from({ length: 8 }, (_, i) => ({
  session_id: session.id,
  lat: base.lat + i * 0.0005,
  lng: base.lng + i * 0.0004,
  altitude_corrected: 10,
  recorded_at: new Date(Date.now() - 300000 + i * 30000).toISOString(),
}));
await fetch(`${SB}/rest/v1/track_points`, {
  method: "POST",
  headers: h,
  body: JSON.stringify(points),
});

console.log(JSON.stringify({ email: user.email, slug, password: "letmein" }));
