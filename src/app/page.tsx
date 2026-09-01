import { MapView } from "@/components/map/MapView";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Home() {
  return (
    <div className="relative w-full" style={{ height: "100dvh" }}>
      <SiteHeader />
      <MapView />
      <div className="pointer-events-none absolute bottom-6 left-6 max-w-xs rounded-xl bg-black/50 p-4 text-sm text-zinc-200 backdrop-blur">
        <p className="font-medium text-white">Live public runs appear here</p>
        <p className="mt-1 text-zinc-400">
          Phase 1 — map is live. Pins and trails ship in Phase 2.
        </p>
      </div>
    </div>
  );
}
