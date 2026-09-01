"use client";

/**
 * Google Play "prominent disclosure" for ACCESS_BACKGROUND_LOCATION: shown
 * inside the native app BEFORE anything that triggers the runtime location
 * permission prompt. Play rejects background-location apps without this
 * exact pattern (full-attention disclosure + affirmative consent).
 */

export const BG_DISCLOSURE_KEY = "rt_bg_disclosure_accepted";

/** True when the user has already accepted the disclosure on this device. */
export function isBgDisclosureAccepted(): boolean {
  try {
    return localStorage.getItem(BG_DISCLOSURE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBgDisclosureAccepted() {
  try {
    localStorage.setItem(BG_DISCLOSURE_KEY, "1");
  } catch {
    // Storage unavailable — the disclosure will simply show again next time.
  }
}

export function BackgroundDisclosure({
  onAllow,
  onCancel,
}: {
  onAllow: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6 text-emerald-500"
          >
            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </div>
        <h2 className="mt-4 text-center text-lg font-semibold text-zinc-900 dark:text-white">
          Location sharing
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          RunnerTracker collects location data to enable live run sharing with
          people you choose, even when the app is closed or not in use. Your
          location is only collected during runs you start, and stops when you
          stop the run.
        </p>
        <button
          onClick={onAllow}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400"
        >
          Allow
        </button>
        <button
          onClick={onCancel}
          className="mt-3 w-full rounded-xl border border-zinc-300 py-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
