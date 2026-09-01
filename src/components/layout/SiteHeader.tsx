import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6">
      <Link
        href="/"
        className="pointer-events-auto font-semibold tracking-tight text-white drop-shadow"
      >
        RunnerTracker
      </Link>
      <nav className="pointer-events-auto flex gap-3 text-sm">
        <Link
          href="/login"
          className="rounded-full bg-black/40 px-4 py-2 backdrop-blur hover:bg-black/60"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
