"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistance, formatDuration } from "@/lib/format";
import { useUnits } from "@/lib/units";
import { defaultRunName } from "@/lib/run-name";

const COUNTDOWN_CHOICES = [
  { value: 0, label: "No countdown" },
  { value: 10, label: "10s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
];

type Session = {
  id: string;
  slug: string;
  display_name: string;
  visibility: "public" | "private";
  status: string;
  distance_meters: number;
  duration_seconds: number;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  countdown: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  live: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  stopped: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800",
};

export function SessionsPanel() {
  const [units] = useUnits();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [viewerPassword, setViewerPassword] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [autoStopMinutes, setAutoStopMinutes] = useState<number | "">("");

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const timer = setInterval(loadSessions, 15000);
    return () => clearInterval(timer);
  }, [loadSessions]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || defaultRunName(),
          visibility,
          viewerPassword: visibility === "private" ? viewerPassword : undefined,
          countdownSeconds,
          autoStopMinutes: autoStopMinutes === "" ? null : autoStopMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create session");
        return;
      }
      setShowForm(false);
      setDisplayName("");
      setViewerPassword("");
      loadSessions();
    } finally {
      setBusy(false);
    }
  }

  async function stopSession(id: string) {
    await fetch(`/api/sessions/${id}/stop`, { method: "POST" });
    loadSessions();
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-transparent">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Run sessions</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400"
        >
          {showForm ? "Cancel" : "Plan a run"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createSession} className="mt-4 space-y-3">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={defaultRunName()}
            maxLength={80}
            aria-label="Run name"
            className={inputCls}
          />
          <div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
              {(["public", "private"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVisibility(option)}
                  className={`rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${
                    visibility === option
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {visibility === "public"
                ? "Anyone can watch on the world map."
                : "Only people with the link and password can watch."}
            </p>
          </div>
          {visibility === "private" && (
            <input
              type="password"
              value={viewerPassword}
              onChange={(e) => setViewerPassword(e.target.value)}
              placeholder="Viewer password (min 4 chars)"
              required
              minLength={4}
              className={inputCls}
            />
          )}
          <div>
            <p className="text-xs text-zinc-500">Countdown before start</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COUNTDOWN_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setCountdownSeconds(choice.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    countdownSeconds === choice.value
                      ? "bg-emerald-500 text-black"
                      : "bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-zinc-500">
            Auto-stop after
            <select
              value={autoStopMinutes}
              onChange={(e) =>
                setAutoStopMinutes(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className={`${inputCls} mt-1`}
            >
              <option value="">Never</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            Plan this run
          </button>
          <p className="text-xs text-zinc-500">
            “Start run” launches it in one tap — on this phone, or from the
            tracker on your paired phone.
          </p>
        </form>
      )}

      <ul className="mt-4 space-y-2">
        {sessions.length === 0 && !showForm && (
          <li className="text-sm text-zinc-500">
            No runs yet — hit Start run on your phone&apos;s tracker, or plan
            one here.
          </li>
        )}
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">{session.display_name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatDistance(session.distance_meters, units)} ·{" "}
                {formatDuration(session.duration_seconds)} · {session.visibility}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[session.status] ?? statusStyles.draft}`}
              >
                {session.status}
              </span>
              {session.status === "draft" && (
                <a
                  href={`/tracker?session=${session.id}`}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-black hover:bg-emerald-400"
                >
                  Start run
                </a>
              )}
              {(session.status === "live" || session.status === "countdown") && (
                <button
                  onClick={() => stopSession(session.id)}
                  className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                >
                  Stop
                </button>
              )}
              <a
                href={`/track/${session.slug}`}
                className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:underline"
              >
                View
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
