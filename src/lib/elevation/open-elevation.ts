type OpenElevationResponse = {
  results?: Array<{ elevation?: number }>;
};

export async function fetchOpenElevation(
  lat: number,
  lng: number,
  baseUrl: string
): Promise<number | null> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations: [{ latitude: lat, longitude: lng }] }),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as OpenElevationResponse;
  const elevation = data.results?.[0]?.elevation;
  return typeof elevation === "number" && Number.isFinite(elevation)
    ? elevation
    : null;
}
