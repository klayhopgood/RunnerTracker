type TilequeryResponse = {
  features?: Array<{ properties?: { ele?: number } }>;
};

export async function fetchMapboxElevation(
  lat: number,
  lng: number,
  accessToken: string
): Promise<number | null> {
  const url = new URL(
    `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json`
  );
  url.searchParams.set("layers", "contour");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = (await res.json()) as TilequeryResponse;
  const ele = data.features?.[0]?.properties?.ele;
  return typeof ele === "number" && Number.isFinite(ele) ? ele : null;
}
