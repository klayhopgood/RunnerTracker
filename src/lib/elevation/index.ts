import {
  elevationCacheKey,
  getCachedElevation,
  setCachedElevation,
} from "./cache";
import { fetchMapboxElevation } from "./mapbox";
import { fetchOpenElevationBatch } from "./open-elevation";

export type ElevationResult = {
  elevationMeters: number;
  source: "cache" | "mapbox" | "open_elevation" | "raw_fallback";
};

export type CorrectElevationInput = {
  lat: number;
  lng: number;
  altitudeRaw?: number | null;
};

export async function correctElevation(
  input: CorrectElevationInput
): Promise<ElevationResult | null> {
  const [result] = await correctElevationBatch([input]);
  return result ?? null;
}

/**
 * Corrects a batch of points in as few network round-trips as possible:
 * cache first, then Mapbox lookups in parallel, then one Open-Elevation
 * batch request for whatever is still missing, then the raw GPS altitude.
 */
export async function correctElevationBatch(
  inputs: CorrectElevationInput[]
): Promise<Array<ElevationResult | null>> {
  const results: Array<ElevationResult | null> = inputs.map(() => null);
  const pending: number[] = [];

  inputs.forEach((input, i) => {
    const { lat, lng } = input;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const cached = getCachedElevation(elevationCacheKey(lat, lng));
    if (cached !== undefined) {
      results[i] = { elevationMeters: cached, source: "cache" };
    } else {
      pending.push(i);
    }
  });

  if (pending.length === 0) return results;

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    const fetched = await Promise.all(
      pending.map((i) =>
        fetchMapboxElevation(inputs[i]!.lat, inputs[i]!.lng, mapboxToken)
      )
    );
    fetched.forEach((elev, j) => {
      if (elev === null) return;
      const i = pending[j]!;
      setCachedElevation(elevationCacheKey(inputs[i]!.lat, inputs[i]!.lng), elev);
      results[i] = { elevationMeters: elev, source: "mapbox" };
    });
  }

  const stillMissing = pending.filter((i) => results[i] === null);
  if (stillMissing.length > 0) {
    const openElevationUrl =
      process.env.OPEN_ELEVATION_URL ?? "https://api.open-elevation.com/api/v1";
    const fetched = await fetchOpenElevationBatch(
      stillMissing.map((i) => ({ lat: inputs[i]!.lat, lng: inputs[i]!.lng })),
      openElevationUrl
    );
    fetched.forEach((elev, j) => {
      if (elev === null) return;
      const i = stillMissing[j]!;
      setCachedElevation(elevationCacheKey(inputs[i]!.lat, inputs[i]!.lng), elev);
      results[i] = { elevationMeters: elev, source: "open_elevation" };
    });
  }

  for (const i of pending) {
    if (results[i] !== null) continue;
    const raw = inputs[i]!.altitudeRaw;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      results[i] = { elevationMeters: raw, source: "raw_fallback" };
    }
  }

  return results;
}

/**
 * Total climb over an elevation series.
 *
 * Uses a light moving average to knock down single-sample spikes, then
 * hysteresis accumulation: a climb is banked once the rise from the running
 * reference exceeds the threshold, and descending moves the reference down.
 * Unlike a consecutive-delta filter, gradual climbs (a few cm per sample)
 * accumulate correctly while GPS/DEM noise below the threshold is ignored.
 */
export function computeElevationGain(
  elevations: number[],
  thresholdMeters = 3
): number {
  if (elevations.length < 2) return 0;

  const smoothed = movingAverage(elevations, 5);
  let gain = 0;
  let ref = smoothed[0]!;
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

function movingAverage(values: number[], window: number): number[] {
  if (values.length <= 2 || window <= 1) return values;
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j]!;
    return sum / (end - start);
  });
}
