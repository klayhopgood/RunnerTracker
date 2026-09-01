import { NextResponse } from "next/server";
import { correctElevation } from "@/lib/elevation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const altitudeRaw = searchParams.has("altitudeRaw")
    ? Number(searchParams.get("altitudeRaw"))
    : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required numbers" },
      { status: 400 }
    );
  }

  const result = await correctElevation({ lat, lng, altitudeRaw });
  if (!result) {
    return NextResponse.json(
      { error: "Elevation lookup failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    lat,
    lng,
    elevationMeters: result.elevationMeters,
    source: result.source,
  });
}
