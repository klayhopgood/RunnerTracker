import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return (
    process.env.VIEWER_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function viewerCookieName(slug: string): string {
  return `rt_viewer_${slug}`;
}

export function viewerCookieValue(slug: string): string {
  return createHmac("sha256", secret()).update(`viewer:${slug}`).digest("hex");
}

export function isValidViewerCookie(slug: string, value: string | undefined): boolean {
  if (!value) return false;
  const expected = viewerCookieValue(slug);
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
