"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the footer on full-viewport map/app routes, where a block-level
 * footer would push the 100dvh layout into a scroll. The homepage exposes
 * the same links via a small overlay instead.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullMapRoute =
    pathname === "/" || pathname === "/tracker" || pathname.startsWith("/track/");
  if (isFullMapRoute) return null;
  return <>{children}</>;
}
