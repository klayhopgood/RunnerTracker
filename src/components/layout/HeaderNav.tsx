"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isNativeApp } from "@/lib/native-geo";

// TODO: swap for the real store listings once published.
const APP_STORE_URL = "https://apps.apple.com/"; // placeholder
// Temporarily the direct APK download so the button is useful today.
const PLAY_STORE_URL =
  "https://github.com/klayhopgood/RunnerTracker/releases/tag/android-latest";

const pillCls =
  "rounded-full bg-white/80 px-4 py-2 text-zinc-700 shadow-sm ring-1 ring-zinc-200 backdrop-blur hover:bg-white dark:bg-black/40 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-black/60";
const primaryCls =
  "rounded-full bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400";

export function HeaderNav({ loggedIn }: { loggedIn: boolean }) {
  // Detected post-mount: the Capacitor bridge only exists inside the app.
  const [inApp, setInApp] = useState(false);
  const [showStores, setShowStores] = useState(false);
  useEffect(() => setInApp(isNativeApp()), []);

  if (loggedIn) {
    return (
      <Link href="/dashboard" className={primaryCls}>
        Dashboard
      </Link>
    );
  }

  // Inside the app, the runner logs in to track; in a browser, runners are
  // sent to the app (browsers can't record GPS with the screen locked).
  if (inApp) {
    return (
      <>
        <Link href="/login" className={pillCls}>
          Log in
        </Link>
        <Link href="/signup" className={primaryCls}>
          Sign up
        </Link>
      </>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setShowStores((v) => !v)} className={primaryCls}>
        <span className="hidden sm:inline">
          Download app to share your live location
        </span>
        <span className="sm:hidden">Get the app</span>
      </button>
      {showStores && (
        <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="block px-4 py-3 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
             App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="block border-t border-zinc-200 px-4 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            ▶ Google Play
          </a>
        </div>
      )}
    </div>
  );
}
