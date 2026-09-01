import {
  elevationCacheKey,
  getCachedElevation,
  setCachedElevation,
} from "./cache";
import { fetchMapboxElevation } from "./mapbox";
import { fetchOpenElevation } from "./open-elevation";

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
  const { lat, lng, altitudeRaw } = input;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const key = elevationCacheKey(lat, lng);
  const cached = getCachedElevation(key);
  if (cached !== undefined) {
    return { elevationMeters: cached, source: "cache" };
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    const mapboxElev = await fetchMapboxElevation(lat, lng, mapboxToken);
    if (mapboxElev !== null) {
      setCachedElevation(key, mapboxElev);
      return { elevationMeters: mapboxElev, source: "mapbox" };
    }
  }

  const openElevationUrl =
    process.env.OPEN_ELEVATION_URL ??
    "https://api.open-elevation.com/api/v1";
  const openElev = await fetchOpenElevation(lat, lng, openElevationUrl);
  if (openElev !== null) {
    setCachedElevation(key, openElev);
    return { elevationMeters: openElev, source: "open_elevation" };
  }

  if (
    typeof altitudeRaw === "number" &&
    Number.isFinite(altitudeRaw)
  ) {
    setCachedElevation(key, altitudeRaw);
    return { elevationMeters: altitudeRaw, source: "raw_fallback" };
  }

  return null;
}

/** Sum positive elevation deltas above a noise threshold (meters). */
export function computeElevationGain(
  elevations: number[],
  thresholdMeters = 3
): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i]! - elevations[i - 1]!;
    if (delta > thresholdMeters) gain += delta;
  }
  return gain;
}
