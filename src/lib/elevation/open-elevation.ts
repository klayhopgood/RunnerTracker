type OpenElevationResponse = {
  results?: Array<{ elevation?: number }>;
};

export async function fetchOpenElevation(
  lat: number,
  lng: number,
  baseUrl: string
): Promise<number | null> {
  const results = await fetchOpenElevationBatch([{ lat, lng }], baseUrl);
  return results[0] ?? null;
}

/** One POST for many coordinates — the public API supports batches. */
export async function fetchOpenElevationBatch(
  coords: Array<{ lat: number; lng: number }>,
  baseUrl: string
): Promise<Array<number | null>> {
  if (coords.length === 0) return [];
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: coords.map((c) => ({ latitude: c.lat, longitude: c.lng })),
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return coords.map(() => null);

    const data = (await res.json()) as OpenElevationResponse;
    return coords.map((_, i) => {
      const elevation = data.results?.[i]?.elevation;
      return typeof elevation === "number" && Number.isFinite(elevation)
        ? elevation
        : null;
    });
  } catch {
    return coords.map(() => null);
  }
}
