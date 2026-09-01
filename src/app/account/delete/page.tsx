import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delete your account — RunnerTracker",
  description:
    "How to permanently delete your RunnerTracker account and all associated data.",
};

const p = "mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const link =
  "font-medium text-emerald-600 underline underline-offset-2 dark:text-emerald-400";

export default async function AccountDeletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <LegalPageShell
      title="Delete your account"
      subtitle="You can permanently delete your RunnerTracker account at any time."
    >
      <h2 className="text-xl font-semibold">How to delete your account</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        <li>
          Sign in to RunnerTracker (on the website or in the app) and open your{" "}
          <strong>Dashboard</strong>.
        </li>
        <li>
          Scroll to the <strong>Danger zone</strong> section at the bottom of
          the dashboard.
        </li>
        <li>
          Type <strong>DELETE</strong> to confirm, then press{" "}
          <strong>Delete account</strong>.
        </li>
      </ol>

      {user ? (
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
        >
          Go to your dashboard →
        </Link>
      ) : (
        <p className={p}>
          <Link href="/login" className={link}>
            Sign in
          </Link>{" "}
          to get to your dashboard.
        </p>
      )}

      <h2 className="mt-10 text-xl font-semibold">What gets deleted</h2>
      <p className={p}>
        Deletion is immediate and <strong>permanent</strong>. It removes:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        <li>your profile (email address and display name),</li>
        <li>all paired devices and pairing codes,</li>
        <li>all run sessions, public and private,</li>
        <li>every recorded GPS trace, and</li>
        <li>your login credentials.</li>
      </ul>
      <p className={p}>
        None of this data can be recovered afterwards. Live viewers of any
        in-progress run will stop receiving updates immediately.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Can&apos;t sign in?</h2>
      <p className={p}>
        If you can&apos;t access your account, email{" "}
        <a href="mailto:support@runnertracker.app" className={link}>
          support@runnertracker.app
        </a>{" "}
        from the address you registered with and we&apos;ll delete the account
        for you.
      </p>
    </LegalPageShell>
  );
}
