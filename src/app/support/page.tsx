import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Support — RunnerTracker",
  description: "Get help with RunnerTracker: contact, FAQs, and account deletion.",
};

const h3 = "font-medium";
const p = "mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const link =
  "font-medium text-emerald-600 underline underline-offset-2 dark:text-emerald-400";

export default function SupportPage() {
  return (
    <LegalPageShell
      title="Support"
      subtitle="Questions, problems, or feedback — we're happy to help."
    >
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-transparent">
        <h2 className="font-medium">Contact us</h2>
        <p className={p}>
          Email{" "}
          <a href="mailto:support@runnertracker.app" className={link}>
            support@runnertracker.app
          </a>{" "}
          and we&apos;ll get back to you as soon as we can.
        </p>
      </section>

      <h2 className="mt-10 text-xl font-semibold">Frequently asked questions</h2>

      <div className="mt-4 space-y-6">
        <div>
          <h3 className={h3}>How do I start a run?</h3>
          <p className={p}>
            Sign in, connect the phone you&apos;ll run with from your dashboard
            (tap &ldquo;Use this phone&rdquo;, or pair another phone with a
            code), create a run session and choose public or private, then open
            the tracker on that phone and tap your session. Your GPS position
            starts streaming to the map straight away.
          </p>
        </div>

        <div>
          <h3 className={h3}>How do private links work?</h3>
          <p className={p}>
            When you create a run with private visibility, you set a password
            and get a unique tracking link. Your run won&apos;t appear on the
            public map — only people you give the link and password to can
            watch it. Viewers enter the password once and can then follow your
            run live.
          </p>
        </div>

        <div>
          <h3 className={h3}>How do I delete my account?</h3>
          <p className={p}>
            You can delete your account, including all runs and GPS traces,
            from your dashboard at any time. See the{" "}
            <Link href="/account/delete" className={link}>
              account deletion instructions
            </Link>{" "}
            for the exact steps and what gets removed.
          </p>
        </div>
      </div>

      <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-400">
        You may also want to read our{" "}
        <Link href="/privacy" className={link}>
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className={link}>
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
