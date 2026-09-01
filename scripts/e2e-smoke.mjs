/* End-to-end smoke test for Phase 2: pair device → start session → stream GPS → verify live feed.
   Run: node scripts/e2e-smoke.mjs [--keep] */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const APP = "http://localhost:3000";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const keep = process.argv.includes("--keep");

const sbHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function sb(path, init = {}) {
  const res = await fetch(`${SB}${path}`, {
    ...init,
    headers: { ...sbHeaders, Prefer: "return=representation", ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function app(path, init = {}) {
  const res = await fetch(`${APP}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

let userId, deviceToken, sessionId, slug;

try {
  // 1. Test user (auth admin) — profile row auto-created by trigger
  const user = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: `e2e-smoke-${Date.now()}@example.com`,
      password: "smoke-test-pass-123",
      email_confirm: true,
      user_metadata: { display_name: "Smoke Tester" },
    }),
  });
  userId = user.id;
  check("create test user", !!userId);

  // 2. Pairing code straight into the table (the dashboard normally does this)
  await sb("/rest/v1/pairing_codes", {
    method: "POST",
    body: JSON.stringify({
      code: "424242",
      user_id: userId,
      expires_at: new Date(Date.now() + 300000).toISOString(),
    }),
  });

  // 3. Pair through the real API
  const pair = await app("/api/devices/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "424242", name: "E2E phone", platform: "web" }),
  });
  deviceToken = pair.body.deviceToken;
  check("pair device via API", pair.status === 200 && !!deviceToken);

  // Reusing the code must fail
  const reuse = await app("/api/devices/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "424242" }),
  });
  check("pairing code is single-use", reuse.status === 400);

  // 4. Session (created directly; dashboard uses the authed /api/sessions route)
  const [session] = await sb("/rest/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      slug: `e2e-smoke-${Date.now().toString(36)}`,
      display_name: "E2E Smoke Run",
      visibility: "public",
      countdown_seconds: 0,
    }),
  });
  sessionId = session.id;
  slug = session.slug;
  check("create session", !!sessionId);

  // 5. Start with the device token
  const start = await app(`/api/sessions/${sessionId}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deviceToken}` },
  });
  check("start session from phone", start.status === 200 && start.body.status === "live",
    JSON.stringify(start.body));

  // 6. Stream a short run along the Sydney Opera House forecourt
  const base = { lat: -33.8568, lng: 151.2153 };
  const t0 = Date.now() - 60000;
  const points = Array.from({ length: 12 }, (_, i) => ({
    lat: base.lat + i * 0.0004,
    lng: base.lng + i * 0.0003,
    altitude: 5 + i,
    accuracy: 8,
    speed: 3.2,
    heading: 35,
    recordedAt: new Date(t0 + i * 5000).toISOString(),
  }));

  const ingest = await app("/api/location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deviceToken}`,
    },
    body: JSON.stringify({ sessionId, points }),
  });
  check(
    "ingest 12 GPS points",
    ingest.status === 200 && ingest.body.accepted === 12,
    `distance=${Math.round(ingest.body.distanceMeters)}m gain=${Math.round(ingest.body.elevationGainMeters ?? 0)}m duration=${ingest.body.durationSeconds}s`
  );
  check("distance computed", (ingest.body.distanceMeters ?? 0) > 400);

  // Bad token must be rejected
  const badAuth = await app("/api/location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deviceToken.split(".")[0]}.wrongsecret`,
    },
    body: JSON.stringify({ sessionId, points: points.slice(0, 1) }),
  });
  check("bad device token rejected", badAuth.status === 401);

  // 7. Public live feed
  const live = await app("/api/sessions/live");
  const me = (live.body.sessions ?? []).find((s) => s.sessionId === sessionId);
  check("session appears in /api/sessions/live", !!me && !!me.lastPoint,
    me ? `lastPoint=${me.lastPoint.lat.toFixed(4)},${me.lastPoint.lng.toFixed(4)}` : "missing");

  // 8. Trail endpoint
  const trail = await app(`/api/track/${slug}/trail`);
  check("trail endpoint returns coordinates", (trail.body.coordinates ?? []).length === 12);

  const detail = await app(`/api/track/${slug}`);
  check("track detail endpoint", detail.status === 200 && detail.body.session.status === "live");

  // 9. Stop from the phone (skipped with --keep so the run stays live for visual checks)
  if (keep) throw { message: "keeping live session", keepEarlyExit: true };
  const stop = await app(`/api/sessions/${sessionId}/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deviceToken}` },
  });
  check("stop session", stop.status === 200 && stop.body.status === "stopped");

  const liveAfter = await app("/api/sessions/live");
  check(
    "stopped session leaves live feed",
    !(liveAfter.body.sessions ?? []).some((s) => s.sessionId === sessionId)
  );
} catch (error) {
  if (!error.keepEarlyExit) check("unexpected error", false, error.message);
} finally {
  if (userId && !keep) {
    // Cascades: profile → devices/sessions → track_points
    await fetch(`${SB}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: sbHeaders,
    });
    console.log("cleaned up test user");
  } else if (keep) {
    console.log(`kept test data: session slug=${slug}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
