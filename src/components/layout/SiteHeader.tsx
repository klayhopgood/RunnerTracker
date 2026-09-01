import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6">
      <Link
        href="/"
        className="pointer-events-auto rounded-full bg-white/80 px-4 py-2 font-semibold tracking-tight text-zinc-900 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-black/40 dark:text-white dark:ring-zinc-700"
      >
        RunnerTracker
      </Link>
      <nav className="pointer-events-auto flex items-center gap-2 text-sm">
        <ThemeToggle />
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full bg-white/80 px-4 py-2 text-zinc-700 shadow-sm ring-1 ring-zinc-200 backdrop-blur hover:bg-white dark:bg-black/40 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-black/60"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
