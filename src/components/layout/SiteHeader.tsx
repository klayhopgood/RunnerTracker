import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./ThemeToggle";
import { HeaderNav } from "./HeaderNav";

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
        <HeaderNav loggedIn={!!user} />
      </nav>
    </header>
  );
}
