"use client";

import { useCallback, useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  platform: string;
  paired_at: string;
  last_seen_at: string | null;
};

export function DevicesPanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/devices");
    if (res.ok) {
      const { devices } = await res.json();
      setDevices(devices);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // While a code is showing, poll so the new phone appears as soon as it pairs.
  useEffect(() => {
    if (!pairingCode || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
      if (secondsLeft % 5 === 0) loadDevices();
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingCode, secondsLeft, loadDevices]);

  async function generateCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/devices/pairing-code", { method: "POST" });
      if (res.ok) {
        const { code, expiresAt } = await res.json();
        setPairingCode(code);
        setSecondsLeft(
          Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/devices/${id}`, { method: "DELETE" });
    loadDevices();
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-transparent">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Your phone</h2>
        <button
          onClick={generateCode}
          disabled={busy}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          Connect a phone
        </button>
      </div>

      {pairingCode && secondsLeft > 0 && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            On your phone, open{" "}
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {typeof window !== "undefined" ? window.location.origin : ""}/tracker
            </span>{" "}
            and enter this code:
          </p>
          <p className="mt-2 text-center font-mono text-4xl font-bold tracking-[0.3em]">
            {pairingCode}
          </p>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Expires in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </p>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {devices.length === 0 && (
          <li className="text-sm text-zinc-500">
            No phone connected yet — pair one to start tracking runs.
          </li>
        )}
        {devices.map((device) => (
          <li
            key={device.id}
            className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">{device.name}</p>
              <p className="text-xs text-zinc-500">
                {device.last_seen_at
                  ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}`
                  : `Paired ${new Date(device.paired_at).toLocaleString()}`}
              </p>
            </div>
            <button
              onClick={() => revoke(device.id)}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
