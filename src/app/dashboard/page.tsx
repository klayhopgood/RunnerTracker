import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          RunnerTracker
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold">
          Hi, {profile?.display_name ?? user.email}
        </h1>
        <p className="mt-2 text-zinc-400">
          Phase 1 scaffold — device pairing and live sessions coming next.
        </p>

        <div className="mt-8 space-y-4 rounded-xl border border-zinc-800 p-6">
          <h2 className="font-medium">Next up</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
            <li>Connect phone (pairing flow)</li>
            <li>Configure and start a live session</li>
            <li>Stream GPS to the map</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
