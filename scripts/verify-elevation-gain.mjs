// One-shot check: recompute a session's elevation gain the way
// src/app/api/location/route.ts now does (raw GPS altitude preferred,
// DEM-corrected fallback). Mirrors selectElevationGainSeries and
// computeElevationGain from src/lib/elevation/index.ts.
//
// Usage: node scripts/verify-elevation-gain.mjs <session-id>

import { readFileSync } from "node:fs";

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node scripts/verify-elevation-gain.mjs <session-id>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const res = await fetch(
  `${url}/rest/v1/track_points?session_id=eq.${sessionId}` +
    `&select=altitude_raw,altitude_corrected,recorded_at&order=recorded_at.asc&limit=20000`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } }
);
if (!res.ok) {
  console.error("Supabase query failed:", res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();

function finite(vs) {
  return vs.filter((v) => typeof v === "number" && Number.isFinite(v));
}

function selectElevationGainSeries(raw, corrected) {
  const rawFinite = finite(raw);
  const coverage = raw.length > 0 ? rawFinite.length / raw.length : 0;
  if (rawFinite.length >= 2 && coverage >= 0.5) {
    const min = Math.min(...rawFinite);
    const max = Math.max(...rawFinite);
    if (max - min > 0.5 && min > -430 && max < 9000) {
      return { series: rawFinite, source: "raw" };
    }
  }
  return { series: finite(corrected), source: "corrected" };
}

function movingAverage(values, window) {
  if (values.length <= 2 || window <= 1) return values;
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j];
    return sum / (end - start);
  });
}

function computeElevationGain(elevations, thresholdMeters = 3) {
  if (elevations.length < 2) return 0;
  const smoothed = movingAverage(elevations, 5);
  let gain = 0;
  let ref = smoothed[0];
  for (const elev of smoothed) {
    if (elev - ref >= thresholdMeters) {
      gain += elev - ref;
      ref = elev;
    } else if (elev < ref) {
      ref = elev;
    }
  }
  return gain;
}

const raw = rows.map((r) => r.altitude_raw);
const corrected = rows.map((r) => r.altitude_corrected);
const rawFinite = finite(raw);
const correctedFinite = finite(corrected);

console.log(`points: ${rows.length}`);
console.log(
  `raw altitude: ${rawFinite.length} finite, range ${Math.min(...rawFinite).toFixed(1)}..${Math.max(...rawFinite).toFixed(1)} m`
);
console.log(
  `corrected altitude: ${correctedFinite.length} finite, range ${Math.min(...correctedFinite).toFixed(1)}..${Math.max(...correctedFinite).toFixed(1)} m`
);

const { series, source } = selectElevationGainSeries(raw, corrected);
console.log(`selected series: ${source} (${series.length} points)`);
console.log(`gain (new logic): ${computeElevationGain(series).toFixed(2)} m`);
console.log(
  `gain (old logic, corrected only): ${computeElevationGain(correctedFinite).toFixed(2)} m`
);
