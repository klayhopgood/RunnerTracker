"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistance, formatDuration, formatPace } from "@/lib/format";
import { useUnits } from "@/lib/units";
import { UnitsToggle } from "@/components/layout/UnitsToggle";
import { DEVICE_TOKEN_KEY as TOKEN_KEY } from "@/lib/device-token";

const FLUSH_INTERVAL_MS = 3000;

type TrackerSession = {
  id: string;
  slug: string;
  display_name: string;
  visibility: string;
  status: string;
  countdown_seconds: number;
  countdown_ends_at: string | null;
};

type PendingPoint = {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
};

type Stats = {
  distanceMeters: number;
  durationSeconds: number;
};

type FinishedRun = {
  name: string;
  slug: string;
  stats: Stats;
};

type Screen = "loading" | "pair" | "sessions" | "run" | "done";

export default function TrackerPage() {
  const [units] = useUnits();
  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pairing
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("My phone");

  // Sessions
  const [sessions, setSessions] = useState<TrackerSession[]>([]);
  const [activeSession, setActiveSession] = useState<TrackerSession | null>(null);

  // Run state
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ distanceMeters: 0, durationSeconds: 0 });
  const [gpsStatus, setGpsStatus] = useState("Waiting for GPS…");
  const [finished, setFinished] = useState<FinishedRun | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const bufferRef = useRef<PendingPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushingRef = useRef(false);
  const sessionRef = useRef<TrackerSession | null>(null);
  const statsRef = useRef<Stats>({ distanceMeters: 0, durationSeconds: 0 });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) setWakeLockActive(false);
      });
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setWakeLockActive(false);
  }, []);

  const loadSessions = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    const res = await fetch("/api/tracker/sessions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      tokenRef.current = null;
      setScreen("pair");
      return;
    }
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setScreen("sessions");
  }, []);

  useEffect(() => {
    tokenRef.current = localStorage.getItem(TOKEN_KEY);
    if (!tokenRef.current) {
      setScreen("pair");
    } else {
      loadSessions();
    }
  }, [loadSessions]);

  async function pair(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: deviceName, platform: "web" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Pairing failed");
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.deviceToken);
      tokenRef.current = data.deviceToken;
      await loadSessions();
    } finally {
      setBusy(false);
    }
  }

  async function pairSelf() {
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
        setError(
          res.status === 401
            ? "You're not logged in on this phone — log in first, or enter a pairing code below."
            : (data.error ?? "Pairing failed")
        );
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.deviceToken);
      tokenRef.current = data.deviceToken;
      await loadSessions();
    } finally {
      setBusy(false);
    }
  }

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    bufferRef.current = [];
    releaseWakeLock();
  }, [releaseWakeLock]);

  const finishRun = useCallback(
    (session: TrackerSession) => {
      setFinished({
        name: session.display_name,
        slug: session.slug,
        stats: { ...statsRef.current },
      });
      setActiveSession(null);
      sessionRef.current = null;
      setScreen("done");
    },
    []
  );

  const flushBuffer = useCallback(async () => {
    // The interval and the visibilitychange handler can both fire this;
    // don't let two drains interleave.
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      // Drain everything, not just one batch — after the tab was backgrounded
      // the buffer may hold far more than 50 points.
      while (bufferRef.current.length > 0) {
        const token = tokenRef.current;
        const session = sessionRef.current;
        if (!token || !session) return;

        const points = bufferRef.current.splice(0, 50);
        let data: {
          status?: string;
          secondsRemaining?: number;
          distanceMeters?: number;
          durationSeconds?: number;
        };
        try {
          const res = await fetch("/api/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId: session.id, points }),
          });
          data = await res.json();
        } catch {
          // Network failure: put the points back so nothing is lost, retry next tick.
          bufferRef.current.unshift(...points);
          return;
        }

        if (data.status === "countdown") {
          setCountdownLeft(data.secondsRemaining ?? null);
          return;
        }
        if (data.status === "live") {
          setCountdownLeft(null);
          if (typeof data.distanceMeters === "number") {
            const next = {
              distanceMeters: data.distanceMeters,
              durationSeconds: data.durationSeconds ?? 0,
            };
            statsRef.current = next;
            setStats(next);
          }
        } else if (data.status === "stopped") {
          // Stopped server-side (auto-stop or from the dashboard).
          stopTracking();
          finishRun(session);
          return;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [finishRun, stopTracking]);

  const beginTracking = useCallback(
    (session: TrackerSession) => {
      sessionRef.current = session;
      setActiveSession(session);
      setScreen("run");
      setStats({ distanceMeters: 0, durationSeconds: 0 });
      statsRef.current = { distanceMeters: 0, durationSeconds: 0 };
      acquireWakeLock();

      if (!("geolocation" in navigator)) {
        setGpsStatus("This device has no GPS support");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsStatus(`GPS lock — ±${Math.round(pos.coords.accuracy)}m`);
          bufferRef.current.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            recordedAt: new Date(pos.timestamp).toISOString(),
          });
        },
        (err) => setGpsStatus(`GPS error: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
      flushTimerRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
    },
    [acquireWakeLock, flushBuffer]
  );

  // Wake locks are auto-released when the tab is backgrounded; re-acquire on
  // return and immediately drain whatever buffered while we were away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!sessionRef.current) return;
      acquireWakeLock();
      flushBuffer();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquireWakeLock, flushBuffer]);

  async function startSession(session: TrackerSession) {
    setBusy(true);
    setError(null);
    try {
      if (session.status === "draft") {
        const res = await fetch(`/api/sessions/${session.id}/start`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not start session");
          return;
        }
        if (data.status === "countdown") {
          setCountdownLeft(session.countdown_seconds);
        }
      }
      beginTracking(session);
    } finally {
      setBusy(false);
    }
  }

  async function endRun() {
    const session = sessionRef.current;
    // Push any remaining buffered points before stopping so the final
    // distance on the server matches what the runner saw.
    await flushBuffer();
    stopTracking();
    if (session && tokenRef.current) {
      await fetch(`/api/sessions/${session.id}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    }
    if (session) {
      finishRun(session);
    } else {
      await loadSessions();
    }
  }

  useEffect(() => stopTracking, [stopTracking]);

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600";

  return (
    <div className="min-h-full px-6 py-10">
      <div className="mx-auto max-w-sm">
        <h1 className="text-center text-xl font-semibold">RunnerTracker</h1>

        {screen === "loading" && (
          <p className="mt-10 text-center text-zinc-500">Loading…</p>
        )}

        {screen === "pair" && (
          <div className="mt-8">
            <button
              onClick={pairSelf}
              disabled={busy}
              className="w-full rounded-lg bg-emerald-500 py-3 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              I&apos;m logged in — use this phone
            </button>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-500">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          <form onSubmit={pair} className="space-y-4">
            <p className="text-sm text-zinc-400">
              Enter the 6-digit code from the dashboard (“Connect another
              phone”) to pair this phone without logging in.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              required
              className={`${inputCls} text-center font-mono text-3xl tracking-[0.3em]`}
            />
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Device name"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-lg bg-emerald-500 py-3 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Pair this phone
            </button>
          </form>
          </div>
        )}

        {screen === "sessions" && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-zinc-400">
              Pick a session to run. Create sessions from your dashboard.
            </p>
            {sessions.length === 0 && (
              <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
                No runnable sessions. Create one on the dashboard first.
              </p>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => startSession(session)}
                disabled={busy}
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-emerald-500/60 dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-50"
              >
                <p className="font-medium">{session.display_name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {session.visibility} ·{" "}
                  {session.status === "draft"
                    ? session.countdown_seconds > 0
                      ? `starts after ${session.countdown_seconds}s countdown`
                      : "starts immediately"
                    : `resume (${session.status})`}
                </p>
              </button>
            ))}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={loadSessions}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Refresh
            </button>
          </div>
        )}

        {screen === "run" && activeSession && (
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-400">{activeSession.display_name}</p>

            {countdownLeft !== null && countdownLeft > 0 ? (
              <div className="mt-10">
                <p className="text-sm uppercase tracking-widest text-amber-400">
                  Starting in
                </p>
                <p className="mt-2 font-mono text-7xl font-bold">{countdownLeft}</p>
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <div>
                  <p className="font-mono text-6xl font-bold">
                    {formatDuration(stats.durationSeconds)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
                    Duration
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
                    <p className="text-2xl font-semibold">
                      {formatDistance(stats.distanceMeters, units)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Distance</p>
                  </div>
                  <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
                    <p className="text-2xl font-semibold">
                      {formatPace(stats.distanceMeters, stats.durationSeconds, units)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Avg pace</p>
                  </div>
                </div>
                <UnitsToggle />
              </div>
            )}

            <p className="mt-6 text-xs text-zinc-500">{gpsStatus}</p>

            <button
              onClick={endRun}
              className="mt-8 w-full rounded-xl bg-red-500 py-4 font-semibold text-white hover:bg-red-400"
            >
              Stop run
            </button>
            <p className="mt-3 text-xs text-zinc-500">
              {wakeLockActive
                ? "Your screen will stay awake during the run."
                : "Keep the screen on while you run."}{" "}
              Switching to another app pauses GPS — tracking picks back up when
              you return.
            </p>
          </div>
        )}

        {screen === "done" && finished && (
          <div className="mt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-7 w-7 text-emerald-500"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Run complete</h2>
            <p className="mt-1 text-sm text-zinc-500">{finished.name}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
                <p className="text-xl font-semibold">
                  {formatDistance(finished.stats.distanceMeters, units)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Distance</p>
              </div>
              <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
                <p className="text-xl font-semibold">
                  {formatDuration(finished.stats.durationSeconds)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Time</p>
              </div>
              <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
                <p className="text-xl font-semibold">
                  {formatPace(
                    finished.stats.distanceMeters,
                    finished.stats.durationSeconds,
                    units
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Avg pace</p>
              </div>
            </div>

            <a
              href={`/track/${finished.slug}`}
              className="mt-6 block w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-400"
            >
              View your run
            </a>
            <a
              href="/dashboard"
              className="mt-3 block w-full rounded-xl border border-zinc-300 py-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Back to dashboard
            </a>
            <button
              onClick={() => {
                setFinished(null);
                loadSessions();
              }}
              className="mt-3 w-full py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Run another session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
