"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Marker, type Map as MaplibreMap } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { MapView } from "./MapView";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_LIVE_CHANNEL, type LocationBroadcast } from "@/lib/realtime";
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  type Units,
} from "@/lib/format";

type LiveRunner = {
  sessionId: string;
  slug: string;
  displayName: string;
  status: string;
  units: Units;
  distanceMeters: number;
  elevationGainMeters: number;
  durationSeconds: number;
  lastPoint: { lat: number; lng: number; elevation: number | null } | null;
};

type SearchResult =
  | { kind: "public"; displayName: string; slug: string }
  | { kind: "private"; displayName: string }
  | { kind: "inactive"; displayName: string }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

const TRAIL_COLOR = "#10b981";

function trailSourceId(sessionId: string) {
  return `trail-${sessionId}`;
}

const panelCls =
  "rounded-xl border border-zinc-200 bg-white/90 text-zinc-900 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-100";
const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600";

export function LiveMap() {
  const router = useRouter();
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const trailsRef = useRef(new Map<string, [number, number][]>());
  const runnersRef = useRef(new Map<string, LiveRunner>());
  const [selected, setSelected] = useState<LiveRunner | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const [openTool, setOpenTool] = useState<"search" | "link" | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [privateLink, setPrivateLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const upsertMarker = useCallback((runner: LiveRunner) => {
    const map = mapRef.current;
    if (!map || !runner.lastPoint) return;
    const { lat, lng } = runner.lastPoint;

    let marker = markersRef.current.get(runner.sessionId);
    if (!marker) {
      const el = document.createElement("button");
      el.setAttribute("aria-label", `Runner ${runner.displayName}`);
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#10b981;border:3px solid #052e22;box-shadow:0 0 0 4px rgba(16,185,129,.35);cursor:pointer";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const latest = runnersRef.current.get(runner.sessionId);
        if (latest) setSelected({ ...latest });
      });
      marker = new Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.set(runner.sessionId, marker);
    } else {
      marker.setLngLat([lng, lat]);
    }
  }, []);

  const drawTrail = useCallback((sessionId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const coords = trailsRef.current.get(sessionId) ?? [];
    const id = trailSourceId(sessionId);
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords },
    };
    const source = map.getSource(id) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(id, { type: "geojson", data });
      map.addLayer({
        id,
        type: "line",
        source: id,
        paint: {
          "line-color": TRAIL_COLOR,
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });
    }
  }, []);

  const appendTrail = useCallback(
    (sessionId: string, lng: number, lat: number) => {
      const coords = trailsRef.current.get(sessionId) ?? [];
      coords.push([lng, lat]);
      trailsRef.current.set(sessionId, coords);
      drawTrail(sessionId);
    },
    [drawTrail]
  );

  const removeRunner = useCallback((sessionId: string) => {
    const map = mapRef.current;
    markersRef.current.get(sessionId)?.remove();
    markersRef.current.delete(sessionId);
    trailsRef.current.delete(sessionId);
    runnersRef.current.delete(sessionId);
    if (map?.getLayer(trailSourceId(sessionId))) {
      map.removeLayer(trailSourceId(sessionId));
      map.removeSource(trailSourceId(sessionId));
    }
    setLiveCount((c) => (c === null ? c : Math.max(0, c - 1)));
    setSelected((cur) => (cur?.sessionId === sessionId ? null : cur));
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/runners/live-count");
      const { count } = await res.json();
      setLiveCount(count);
    } catch {
      /* non-critical */
    }
  }, []);

  const handleMapReady = useCallback(
    async (map: MaplibreMap) => {
      mapRef.current = map;
      map.on("click", () => setSelected(null));
      // Theme switches replace the style and wipe custom layers — put trails back.
      map.on("style.load", () => {
        for (const sessionId of trailsRef.current.keys()) drawTrail(sessionId);
      });

      refreshCount();
      try {
        const res = await fetch("/api/sessions/live");
        const { sessions } = (await res.json()) as { sessions: LiveRunner[] };
        for (const runner of sessions ?? []) {
          runnersRef.current.set(runner.sessionId, runner);
          upsertMarker(runner);
          const trailRes = await fetch(`/api/track/${runner.slug}/trail`);
          const { coordinates } = (await trailRes.json()) as {
            coordinates: [number, number, number][];
          };
          trailsRef.current.set(
            runner.sessionId,
            (coordinates ?? []).map(([lng, lat]) => [lng, lat])
          );
          drawTrail(runner.sessionId);
        }
        const first = (sessions ?? []).find((r) => r.lastPoint);
        if (first?.lastPoint) {
          map.easeTo({
            center: [first.lastPoint.lng, first.lastPoint.lat],
            zoom: 13,
          });
        }
      } catch (error) {
        console.error("Failed to load live sessions:", error);
      }
    },
    [drawTrail, refreshCount, upsertMarker]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(PUBLIC_LIVE_CHANNEL)
      .on("broadcast", { event: "location_update" }, ({ payload }) => {
        const update = payload as LocationBroadcast;
        const existing = runnersRef.current.get(update.sessionId);
        if (!existing) refreshCount();
        const runner: LiveRunner = {
          sessionId: update.sessionId,
          slug: update.slug,
          displayName: update.displayName,
          status: update.status,
          units: existing?.units ?? "metric",
          distanceMeters: update.distanceMeters,
          elevationGainMeters: update.elevationGainMeters,
          durationSeconds: update.durationSeconds,
          lastPoint: {
            lat: update.lat,
            lng: update.lng,
            elevation: update.elevation,
          },
        };
        runnersRef.current.set(update.sessionId, runner);
        upsertMarker(runner);
        appendTrail(update.sessionId, update.lng, update.lat);
        setSelected((cur) =>
          cur?.sessionId === update.sessionId ? { ...runner } : cur
        );
      })
      .on("broadcast", { event: "session_started" }, () => refreshCount())
      .on("broadcast", { event: "session_stopped" }, ({ payload }) => {
        removeRunner((payload as { sessionId: string }).sessionId);
      })
      .subscribe();

    const countTimer = setInterval(refreshCount, 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(countTimer);
    };
  }, [appendTrail, refreshCount, removeRunner, upsertMarker]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchBusy(true);
    setSearchResult(null);
    try {
      const res = await fetch(
        `/api/runners/search?name=${encodeURIComponent(searchName.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setSearchResult({ kind: "error", message: data.error ?? "Search failed" });
        return;
      }
      if (!data.found) {
        setSearchResult({ kind: "not_found" });
        return;
      }
      if (data.status === "public") {
        setSearchResult({
          kind: "public",
          displayName: data.displayName,
          slug: data.slug,
        });
        if (data.location) {
          mapRef.current?.easeTo({
            center: [data.location.lng, data.location.lat],
            zoom: 14,
            duration: 1500,
          });
          const runner = [...runnersRef.current.values()].find(
            (r) => r.slug === data.slug
          );
          if (runner) setSelected({ ...runner });
        }
      } else if (data.status === "private") {
        setSearchResult({ kind: "private", displayName: data.displayName });
      } else {
        setSearchResult({ kind: "inactive", displayName: data.displayName });
      }
    } catch {
      setSearchResult({ kind: "error", message: "Search failed" });
    } finally {
      setSearchBusy(false);
    }
  }

  function openPrivateLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    const raw = privateLink.trim();
    // Accept a full share URL or just the run code itself.
    const match = raw.match(/\/track\/([A-Za-z0-9_-]+)/);
    const slug = match?.[1] ?? (/^[A-Za-z0-9_-]{6,}$/.test(raw) ? raw : null);
    if (!slug) {
      setLinkError("That doesn't look like a tracking link");
      return;
    }
    router.push(`/track/${slug}`);
  }

  return (
    <>
      <MapView onMapReady={handleMapReady} />

      {/* Bottom-left toolkit */}
      <div className="absolute bottom-6 left-4 flex w-72 flex-col gap-2 sm:left-6">
        {openTool === "search" && (
          <div className={`${panelCls} p-3`}>
            <form onSubmit={runSearch} className="flex gap-2">
              <input
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setSearchResult(null);
                }}
                placeholder="Runner's username"
                className={inputCls}
                autoFocus
              />
              <button
                type="submit"
                disabled={searchBusy || searchName.trim().length < 2}
                className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {searchBusy ? "…" : "Find"}
              </button>
            </form>
            {searchResult && (
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                {searchResult.kind === "public" && (
                  <>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {searchResult.displayName}
                    </span>{" "}
                    is live — zooming to them now.
                  </>
                )}
                {searchResult.kind === "private" && (
                  <>
                    <span className="font-medium">{searchResult.displayName}</span>{" "}
                    is tracking in private mode. Ask them for their tracking
                    link and password.
                  </>
                )}
                {searchResult.kind === "inactive" && (
                  <>
                    <span className="font-medium">{searchResult.displayName}</span>{" "}
                    isn&apos;t tracking right now.
                  </>
                )}
                {searchResult.kind === "not_found" && "No runner found with that username."}
                {searchResult.kind === "error" && searchResult.message}
              </p>
            )}
          </div>
        )}

        {openTool === "link" && (
          <div className={`${panelCls} p-3`}>
            <form onSubmit={openPrivateLink} className="flex gap-2">
              <input
                value={privateLink}
                onChange={(e) => {
                  setPrivateLink(e.target.value);
                  setLinkError(null);
                }}
                placeholder="Paste tracking link"
                className={inputCls}
                autoFocus
              />
              <button
                type="submit"
                disabled={!privateLink.trim()}
                className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                Open
              </button>
            </form>
            {linkError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">{linkError}</p>
            )}
          </div>
        )}

        <div className={`${panelCls} flex items-center gap-1 p-1.5`}>
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                (liveCount ?? 0) > 0 ? "animate-pulse bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
              }`}
            />
            {liveCount === null ? "…" : `${liveCount} tracking`}
          </span>
          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => setOpenTool(openTool === "search" ? null : "search")}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              openTool === "search"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Find a runner
          </button>
          <button
            onClick={() => setOpenTool(openTool === "link" ? null : "link")}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              openTool === "link"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Private link
          </button>
        </div>
      </div>

      {selected && (
        <div className={`${panelCls} absolute right-4 top-16 w-72 p-4 text-sm`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{selected.displayName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"
              aria-label="Close stats"
            >
              ✕
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs text-zinc-500">Distance</dt>
              <dd className="font-medium">
                {formatDistance(selected.distanceMeters, selected.units)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Duration</dt>
              <dd className="font-medium">
                {formatDuration(selected.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Avg pace</dt>
              <dd className="font-medium">
                {formatPace(
                  selected.distanceMeters,
                  selected.durationSeconds,
                  selected.units
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Elevation gain</dt>
              <dd className="font-medium">
                {formatElevation(selected.elevationGainMeters, selected.units)}
              </dd>
            </div>
          </dl>
          <a
            href={`/track/${selected.slug}`}
            className="mt-3 block rounded-lg bg-emerald-500 px-3 py-1.5 text-center font-medium text-black hover:bg-emerald-400"
          >
            Follow this run
          </a>
        </div>
      )}
    </>
  );
}
