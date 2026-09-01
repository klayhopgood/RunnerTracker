import Link from "next/link";

const linkCls = "hover:text-zinc-900 dark:hover:text-white";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 px-6 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p>© {new Date().getFullYear()} RunnerTracker</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className={linkCls}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={linkCls}>
            Terms
          </Link>
          <Link href="/support" className={linkCls}>
            Support
          </Link>
          <Link href="/account/delete" className={linkCls}>
            Delete account
          </Link>
        </nav>
      </div>
    </footer>
  );
}
