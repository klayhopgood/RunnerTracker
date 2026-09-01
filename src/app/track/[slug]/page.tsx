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
        <Link href="/" className="rounded-full bg-white/80 px-4 py-2 font-semibold tracking-tight text-zinc-900 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-black/40 dark:text-white dark:ring-zinc-700">
          RunnerTracker
        </Link>
      </header>
      <TrackViewer slug={slug} />
    </div>
  );
}
