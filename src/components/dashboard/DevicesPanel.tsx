"use client";

import { useCallback, useEffect, useState } from "react";
import { DEVICE_TOKEN_KEY } from "@/lib/device-token";

type Device = {
  id: string;
  name: string;
  platform: string;
  paired_at: string;
  last_seen_at: string | null;
};

export function DevicesPanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/devices");
    if (res.ok) {
      const { devices } = await res.json();
      setDevices(devices);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (token) setThisDeviceId(token.split(".")[0] ?? null);
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

  // "This phone" only counts if it's still in the (non-revoked) device list.
  const thisDeviceConnected = devices.some((d) => d.id === thisDeviceId);

  async function pairThisDevice() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/pair-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "This phone", platform: "web" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not connect this phone");
        return;
      }
      localStorage.setItem(DEVICE_TOKEN_KEY, data.deviceToken);
      setThisDeviceId(data.deviceId);
      await loadDevices();
    } finally {
      setBusy(false);
    }
  }

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
    if (id === thisDeviceId) {
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      setThisDeviceId(null);
    }
    loadDevices();
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-transparent">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Your phone</h2>
        <div className="flex items-center gap-2">
          {!thisDeviceConnected && (
            <button
              onClick={pairThisDevice}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Use this phone
            </button>
          )}
          <button
            onClick={generateCode}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 disabled:opacity-50"
          >
            Connect another phone
          </button>
        </div>
      </div>

      {thisDeviceConnected && (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          This phone is connected — you can start a run right from here.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {pairingCode && secondsLeft > 0 && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            On the other phone, open{" "}
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
            No phone connected yet. On the phone you run with, just tap “Use
            this phone”.
          </li>
        )}
        {devices.map((device) => (
          <li
            key={device.id}
            className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">
                {device.name}
                {device.id === thisDeviceId && (
                  <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                    this phone
                  </span>
                )}
              </p>
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
