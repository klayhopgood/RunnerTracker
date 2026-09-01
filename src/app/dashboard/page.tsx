import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DevicesPanel } from "@/components/dashboard/DevicesPanel";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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
    <div className="min-h-full">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link href="/" className="font-semibold tracking-tight">
          RunnerTracker
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
        <div>
          <h1 className="text-3xl font-semibold">
            Hi, {profile?.display_name ?? user.email}
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Pair your phone, create a session, then start it from the tracker.
          </p>
        </div>

        <DevicesPanel />
        <SessionsPanel />
      </main>
    </div>
  );
}
