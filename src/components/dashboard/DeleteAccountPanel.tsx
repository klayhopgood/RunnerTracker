"use client";

import { useState } from "react";
import { DEVICE_TOKEN_KEY } from "@/lib/device-token";

export function DeleteAccountPanel() {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirmText === "DELETE";

  async function deleteAccount() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not delete your account. Please try again.");
        setBusy(false);
        return;
      }
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      // Deliberate full navigation: the account no longer exists, so every
      // bit of client state (Supabase auth, realtime channels) must be dropped.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch {
      setError("Could not delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-300/60 bg-white p-6 shadow-sm dark:border-red-900/60 dark:bg-transparent">
      <h2 className="font-medium text-red-600 dark:text-red-400">Danger zone</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Deleting your account permanently removes your profile, paired devices,
        run sessions, and all recorded GPS traces. This cannot be undone.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder="Type DELETE to confirm"
          className="w-56 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
          aria-label="Type DELETE to confirm account deletion"
        />
        <button
          onClick={deleteAccount}
          disabled={!confirmed || busy}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete account"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </section>
  );
}
