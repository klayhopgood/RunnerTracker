import Link from "next/link";
import { TrackViewer } from "@/components/map/TrackViewer";

export const dynamic = "force-dynamic";

export default async function TrackPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  return (
    <div className="relative w-full" style={{ height: "100dvh" }}>
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight text-white">
          RunnerTracker
        </Link>
      </header>
      <TrackViewer slug={slug} />
    </div>
  );
}
