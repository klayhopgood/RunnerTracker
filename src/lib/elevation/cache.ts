const cache = new Map<string, number>();

/** ~30 m grid for deduplicating DEM lookups */
export function elevationCacheKey(lat: number, lng: number): string {
  const grid = 0.0003;
  const rLat = Math.round(lat / grid) * grid;
  const rLng = Math.round(lng / grid) * grid;
  return `${rLat.toFixed(4)},${rLng.toFixed(4)}`;
}

export function getCachedElevation(key: string): number | undefined {
  return cache.get(key);
}

export function setCachedElevation(key: string, meters: number): void {
  cache.set(key, meters);
}
