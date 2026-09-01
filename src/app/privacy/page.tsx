import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — RunnerTracker",
  description:
    "How RunnerTracker collects, uses, and protects your data, including precise and background location.",
};

const h2 = "mt-10 text-xl font-semibold";
const p = "mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const ul =
  "mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const link =
  "font-medium text-emerald-600 underline underline-offset-2 dark:text-emerald-400";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" subtitle="Last updated: 1 September 2026">
      <p className={p}>
        RunnerTracker (&ldquo;RunnerTracker&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) is a live run-tracking service operated by the
        RunnerTracker team. It lets runners share their live GPS position on a
        map, either publicly or via a private password-protected link. This
        policy explains what information we collect, why we collect it, who
        processes it on our behalf, and the choices you have. We&apos;ve tried
        to keep it in plain English.
      </p>

      <h2 className={h2}>What we collect</h2>
      <ul className={ul}>
        <li>
          <strong>Account details</strong> — your email address and a display
          name, provided when you sign up.
        </li>
        <li>
          <strong>Precise location</strong> — GPS coordinates (latitude,
          longitude, altitude, speed, heading, accuracy) recorded while you are
          tracking a run, including background location as described below.
        </li>
        <li>
          <strong>Device information</strong> — when you pair a phone, we store
          the device&apos;s name, platform (iOS, Android, or web), and a pairing
          token so the device can stream location securely.
        </li>
        <li>
          <strong>Run details</strong> — run names, visibility settings
          (public or private), and derived statistics such as distance,
          duration, and elevation gain.
        </li>
      </ul>
      <p className={p}>
        We do not collect payment details, contacts, photos, health data, or
        advertising identifiers.
      </p>

      <h2 className={h2}>Background location</h2>
      <p className={p}>
        RunnerTracker collects precise location <strong>in the background</strong>{" "}
        — that is, while the app is not on screen or your phone is locked —{" "}
        <strong>only during a run that you have started</strong>. Background
        collection exists for one purpose: so your live position keeps updating
        on the map for the people you are sharing your run with, even when your
        phone is in your pocket. Location collection starts when you start a
        run, stops when you stop the run (or it auto-stops), and never runs at
        any other time. You can also stop it at any moment by ending the run or
        revoking the app&apos;s location permission in your phone&apos;s
        settings.
      </p>

      <h2 className={h2}>Why we collect it</h2>
      <p className={p}>
        We use your information solely to operate the service: creating and
        securing your account, streaming your live position to your run&apos;s
        map page, computing run statistics, letting you manage paired devices,
        and sending essential transactional emails (such as password resets).
        We do not use your data for advertising or profiling, and we do not use
        any analytics or ad-tracking SDKs.
      </p>

      <h2 className={h2}>Public and private runs</h2>
      <p className={p}>
        When you start a <strong>public</strong> run, your display name, live
        position, trail, and run statistics are visible to anyone viewing the
        public map or your run page while the run is live. When you start a{" "}
        <strong>private</strong> run, that information is visible only to
        people who have your run link and the password you set. Location
        sharing is always user-initiated — nothing is shared unless you start a
        run, and you choose its visibility each time.
      </p>

      <h2 className={h2}>Third-party processors</h2>
      <p className={p}>
        We don&apos;t sell your personal information to anyone. A small number
        of service providers process data on our behalf to run the service:
      </p>
      <ul className={ul}>
        <li>
          <strong>Supabase</strong> — database and authentication. Stores your
          account, devices, runs, and GPS traces.
        </li>
        <li>
          <strong>Vercel</strong> — hosting. Serves the website and API.
        </li>
        <li>
          <strong>MapTiler</strong> — map tiles. Requests are proxied through
          our servers, so MapTiler does not receive your identity.
        </li>
        <li>
          <strong>Mapbox and Open-Elevation</strong> — elevation lookups. They
          receive coordinates only, with no account or identity information.
        </li>
        <li>
          <strong>SendGrid</strong> — transactional email, such as password
          reset messages.
        </li>
      </ul>

      <h2 className={h2}>Cookies and local storage</h2>
      <p className={p}>
        We use only the cookies the service needs to function: a session cookie
        that keeps you signed in, and a viewer-access cookie that remembers you
        entered the correct password for a private run link. We also store your
        theme and unit preferences (for example dark mode, kilometres vs miles)
        in your browser&apos;s local storage. There are no advertising or
        analytics cookies.
      </p>

      <h2 className={h2}>How long we keep your data</h2>
      <p className={p}>
        Your runs and GPS traces are kept until you delete them or delete your
        account. Deleting your account permanently removes your profile, paired
        devices, runs, and all recorded GPS traces. See{" "}
        <Link href="/account/delete" className={link}>
          how to delete your account
        </Link>
        .
      </p>

      <h2 className={h2}>Your rights</h2>
      <p className={p}>
        You can access the data we hold about you and you can delete it. Your
        runs, devices, and profile are visible and manageable from your
        dashboard, and you can delete your account (and everything associated
        with it) from the dashboard at any time. If you need help exercising
        these rights, email{" "}
        <a href="mailto:support@runnertracker.app" className={link}>
          support@runnertracker.app
        </a>{" "}
        and we&apos;ll assist.
      </p>

      <h2 className={h2}>Children</h2>
      <p className={p}>
        RunnerTracker is not directed at children under 13, and we do not
        knowingly collect personal information from them. If you believe a
        child under 13 has created an account, contact us and we will delete
        it.
      </p>

      <h2 className={h2}>Security</h2>
      <p className={p}>
        Data is transmitted over HTTPS and stored with access controls,
        including row-level security in our database. Private run passwords and
        device tokens are stored hashed. No system is perfectly secure, but we
        design the service to minimise the data we hold and who can reach it.
      </p>

      <h2 className={h2}>Changes to this policy</h2>
      <p className={p}>
        If we change this policy, we will update this page and the
        &ldquo;last updated&rdquo; date above. Material changes will be
        communicated by email or an in-app notice.
      </p>

      <h2 className={h2}>Governing law and contact</h2>
      <p className={p}>
        This policy is governed by the laws of Queensland, Australia. For any
        privacy question or request, email{" "}
        <a href="mailto:support@runnertracker.app" className={link}>
          support@runnertracker.app
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
