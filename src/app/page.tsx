import { LiveMap } from "@/components/map/LiveMap";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Home() {
  return (
    <div className="relative w-full" style={{ height: "100dvh" }}>
      <SiteHeader />
      <LiveMap />
    </div>
  );
}
