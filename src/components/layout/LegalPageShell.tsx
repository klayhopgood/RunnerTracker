import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Shared chrome for the legal/support pages (privacy, terms, support, account deletion). */
export function LegalPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link href="/" className="font-semibold tracking-tight">
          RunnerTracker
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
