import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const key =
    process.env.MAPTILER_KEY ?? process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "MapTiler key not configured" },
      { status: 500 }
    );
  }

  const { path } = await context.params;
  const target = new URL(`https://api.maptiler.com/${path.join("/")}`);

  request.nextUrl.searchParams.forEach((value, name) => {
    if (name !== "key") target.searchParams.set(name, value);
  });
  target.searchParams.set("key", key);

  const upstream = await fetch(target.toString());
  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
