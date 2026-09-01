/* Verifies POST /api/devices/pair-self with a real Supabase session cookie.
   Run: node scripts/test-pair-self.mjs <email> <password> */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const APP = "http://localhost:3000";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const [email, password] = process.argv.slice(2);

// 1. Password grant → session
const tokenRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const session = await tokenRes.json();
if (!tokenRes.ok) {
  console.error("FAIL login:", session);
  process.exit(1);
}
console.log("PASS  login");

// 2. Build the @supabase/ssr cookie (base64url-encoded session JSON)
const ref = new URL(SB).hostname.split(".")[0];
const cookieValue =
  "base64-" +
  Buffer.from(JSON.stringify(session)).toString("base64url");
const cookie = `sb-${ref}-auth-token=${cookieValue}`;

// 3. pair-self with the session cookie
const pairRes = await fetch(`${APP}/api/devices/pair-self`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({ name: "This phone", platform: "web" }),
});
const pair = await pairRes.json();
if (!pairRes.ok || !pair.deviceToken) {
  console.error("FAIL pair-self:", pairRes.status, pair);
  process.exit(1);
}
console.log("PASS  pair-self → deviceId", pair.deviceId);

// 4. Device token actually works against a device-authed endpoint
const sessRes = await fetch(`${APP}/api/tracker/sessions`, {
  headers: { Authorization: `Bearer ${pair.deviceToken}` },
});
const sess = await sessRes.json();
if (!sessRes.ok) {
  console.error("FAIL tracker sessions with device token:", sessRes.status, sess);
  process.exit(1);
}
console.log("PASS  device token accepted, sessions:", (sess.sessions ?? []).length);

// 5. pair-self without a cookie must 401
const noAuth = await fetch(`${APP}/api/devices/pair-self`, { method: "POST" });
console.log(noAuth.status === 401 ? "PASS  401 when logged out" : `FAIL  expected 401, got ${noAuth.status}`);
process.exit(noAuth.status === 401 ? 0 : 1);
