import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service — RunnerTracker",
  description: "The terms that govern your use of RunnerTracker.",
};

const h2 = "mt-10 text-xl font-semibold";
const p = "mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const ul =
  "mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const link =
  "font-medium text-emerald-600 underline underline-offset-2 dark:text-emerald-400";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" subtitle="Last updated: 1 September 2026">
      <p className={p}>
        These terms govern your use of RunnerTracker, a live run-tracking
        service operated by the RunnerTracker team. By creating an account or
        using the website or mobile app, you agree to these terms. If you do
        not agree, please do not use the service. Our{" "}
        <Link href="/privacy" className={link}>
          Privacy Policy
        </Link>{" "}
        explains how we handle your data.
      </p>

      <h2 className={h2}>The service</h2>
      <p className={p}>
        RunnerTracker lets you record and share your live GPS position during a
        run, either on a public map or via a private password-protected link,
        and lets viewers watch runs in a web browser. The service is provided
        free of charge and may change over time.
      </p>

      <h2 className={h2}>Your account</h2>
      <p className={p}>
        You must provide accurate information when signing up and keep your
        password secure. You are responsible for activity that happens under
        your account and on devices you pair with it. You must be at least 13
        years old to use RunnerTracker.
      </p>

      <h2 className={h2}>Acceptable use</h2>
      <p className={p}>You agree not to:</p>
      <ul className={ul}>
        <li>
          track any person&apos;s location without their knowledge and consent
          — only ever track a device you own or control;
        </li>
        <li>
          use offensive, misleading, or impersonating display names or run
          names;
        </li>
        <li>
          attempt to gain unauthorised access to other users&apos; data,
          private run links, or the service&apos;s infrastructure;
        </li>
        <li>
          send falsified GPS data, scrape the service, or interfere with its
          normal operation;
        </li>
        <li>use the service for any unlawful purpose.</li>
      </ul>

      <h2 className={h2}>Your content</h2>
      <p className={p}>
        Content you provide — such as your display name and run names — remains
        yours. You grant us the limited licence needed to store it and display
        it as part of the service (for example, showing your display name next
        to your live position on a run you chose to share). You are responsible
        for what you share and with whom: a public run is visible to anyone,
        and anyone with a private link and its password can view that run.
      </p>

      <h2 className={h2}>Not a safety or emergency service</h2>
      <p className={p}>
        RunnerTracker is a recreational tracking tool.{" "}
        <strong>
          Do not rely on RunnerTracker for personal safety, supervision, or
          emergency response.
        </strong>{" "}
        Location updates can be delayed, inaccurate, or interrupted by GPS
        conditions, network coverage, battery-saving features, or device
        settings, and a run appearing &ldquo;live&rdquo; does not guarantee the
        runner is safe. If someone may be in danger, contact emergency services
        — in Australia, call 000.
      </p>

      <h2 className={h2}>GPS accuracy</h2>
      <p className={p}>
        GPS positions, distances, paces, and elevation figures are estimates
        and are not guaranteed to be accurate. Terrain, weather, buildings, and
        device hardware all affect accuracy.
      </p>

      <h2 className={h2}>Termination</h2>
      <p className={p}>
        You can stop using the service and delete your account at any time —
        see{" "}
        <Link href="/account/delete" className={link}>
          how to delete your account
        </Link>
        . We may suspend or terminate accounts that violate these terms, abuse
        the service, or create risk for other users, and we may discontinue the
        service itself with reasonable notice where practicable.
      </p>

      <h2 className={h2}>Disclaimer of warranties</h2>
      <p className={p}>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind, whether express or
        implied, including fitness for a particular purpose, availability, or
        accuracy of location data. Nothing in these terms excludes rights you
        have under the Australian Consumer Law or other laws that cannot be
        excluded by agreement.
      </p>

      <h2 className={h2}>Limitation of liability</h2>
      <p className={p}>
        To the maximum extent permitted by law, the RunnerTracker team will not
        be liable for any indirect, incidental, special, or consequential loss,
        or for any loss arising from reliance on location data, service
        interruptions, or unauthorised access to shared run links. Where
        liability cannot be excluded, it is limited, at our option, to
        resupplying the service.
      </p>

      <h2 className={h2}>Changes to these terms</h2>
      <p className={p}>
        We may update these terms from time to time. We will update the
        &ldquo;last updated&rdquo; date above, and material changes will be
        communicated by email or an in-app notice. Continuing to use the
        service after changes take effect means you accept the updated terms.
      </p>

      <h2 className={h2}>Governing law and contact</h2>
      <p className={p}>
        These terms are governed by the laws of Queensland, Australia, and
        disputes are subject to the courts of Queensland. Questions? Email{" "}
        <a href="mailto:support@runnertracker.app" className={link}>
          support@runnertracker.app
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
