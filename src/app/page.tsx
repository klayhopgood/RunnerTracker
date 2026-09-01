import { MapView } from "@/components/map/MapView";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <div className="relative h-[100dvh] w-full flex-1">
        <MapView className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute bottom-6 left-6 max-w-xs rounded-xl bg-black/50 p-4 text-sm text-zinc-200 backdrop-blur">
          <p className="font-medium text-white">Live public runs appear here</p>
          <p className="mt-1 text-zinc-400">
            Phase 1 — map is live. Pins and trails ship in Phase 2.
          </p>
        </div>
      </div>
    </div>
  );
}
