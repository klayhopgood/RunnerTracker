import Link from "next/link";
import { LiveMap } from "@/components/map/LiveMap";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const dynamic = "force-dynamic";

const overlayLinkCls =
  "pointer-events-auto hover:text-zinc-900 hover:underline dark:hover:text-white";

export default function Home() {
  return (
    <div className="relative w-full" style={{ height: "100dvh" }}>
      <SiteHeader />
      <LiveMap />
      {/* The regular site footer is hidden on this full-map page; keep the
          store-required legal links reachable via a tiny overlay instead.
          Sits just above the map's attribution control. */}
      <nav className="pointer-events-none absolute bottom-10 right-2 z-10 flex gap-3 rounded-full bg-white/70 px-3 py-1 text-[11px] text-zinc-600 backdrop-blur dark:bg-black/40 dark:text-zinc-300">
        <Link href="/privacy" className={overlayLinkCls}>
          Privacy
        </Link>
        <Link href="/terms" className={overlayLinkCls}>
          Terms
        </Link>
        <Link href="/support" className={overlayLinkCls}>
          Support
        </Link>
      </nav>
    </div>
  );
}
