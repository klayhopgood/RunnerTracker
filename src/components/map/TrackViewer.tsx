"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Marker, type Map as MaplibreMap } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { MapView } from "./MapView";
import { createClient } from "@/lib/supabase/client";
import { trackChannel, type LocationBroadcast } from "@/lib/realtime";
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  type Units,
} from "@/lib/format";

type SessionDetail = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  units: Units;
  distance_meters: number;
  elevation_gain_meters: number;
  duration_seconds: number;
};

const TRAIL_SOURCE = "viewer-trail";

const panelCls =
  "rounded-xl border border-zinc-200 bg-white/90 text-zinc-900 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-100";

export function TrackViewer({ slug }: { slug: string }) {
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const coordsRef = useRef<[number, number][]>([]);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const renderTrail = useCallback(() => {
    const map = mapRef.current;
    if (!map || coordsRef.current.length === 0) return;
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: coordsRef.current,
      },
    };
    const source = map.getSource(TRAIL_SOURCE) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(TRAIL_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: TRAIL_SOURCE,
        type: "line",
        source: TRAIL_SOURCE,
        paint: { "line-color": "#10b981", "line-width": 4, "line-opacity": 0.9 },
      });
    }
  }, []);

  const moveMarker = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #052e22;box-shadow:0 0 0 5px rgba(16,185,129,.35)";
      markerRef.current = new Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  const loadData = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const detailRes = await fetch(`/api/track/${slug}`);
      if (detailRes.status === 401) {
        const body = await detailRes.json();
        if (body.needsPassword) {
          setNeedsPassword(true);
          return;
        }
      }
      if (!detailRes.ok) {
        setNotFound(true);
        return;
      }
      const { session } = await detailRes.json();
      setSession(session);
      setNeedsPassword(false);

      const trailRes = await fetch(`/api/track/${slug}/trail`);
      const { coordinates } = (await trailRes.json()) as {
        coordinates: [number, number, number][];
      };
      coordsRef.current = (coordinates ?? []).map(([lng, lat]) => [lng, lat]);
      renderTrail();

      const last = coordsRef.current[coordsRef.current.length - 1];
      if (last) {
        moveMarker(last[0], last[1]);
        map.easeTo({ center: last, zoom: 15 });
      }
    } catch {
      setNotFound(true);
    }
  }, [moveMarker, renderTrail, slug]);

  const handleMapReady = useCallback(
    (map: MaplibreMap) => {
      mapRef.current = map;
      // Theme switches replace the style — put the trail back.
      map.on("style.load", renderTrail);
      loadData();
    },
    [loadData, renderTrail]
  );

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/track/${slug}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json();
        setPasswordError(body.error ?? "Wrong password");
        return;
      }
      setPassword("");
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(trackChannel(slug))
      .on("broadcast", { event: "location_update" }, ({ payload }) => {
        const update = payload as LocationBroadcast;
        coordsRef.current.push([update.lng, update.lat]);
        renderTrail();
        moveMarker(update.lng, update.lat);
        mapRef.current?.easeTo({ center: [update.lng, update.lat] });
        setSession((cur) =>
          cur
            ? {
                ...cur,
                status: "live",
                distance_meters: update.distanceMeters,
                elevation_gain_meters: update.elevationGainMeters,
                duration_seconds: update.durationSeconds,
              }
            : cur
        );
      })
      .on("broadcast", { event: "session_stopped" }, () => {
        setSession((cur) => (cur ? { ...cur, status: "stopped" } : cur));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moveMarker, renderTrail, slug]);

  if (notFound) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
        This run doesn&apos;t exist.
      </div>
    );
  }

  return (
    <>
      <MapView onMapReady={handleMapReady} />

      {needsPassword && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">
          <form
            onSubmit={submitPassword}
            className={`${panelCls} w-full max-w-sm p-6`}
          >
            <h2 className="font-semibold">This run is private</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Enter the password the runner shared with you.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
            {passwordError && (
              <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !password}
              className="mt-4 w-full rounded-lg bg-emerald-500 py-2 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              View run
            </button>
          </form>
        </div>
      )}

      {session && (
        <div
          className={`${panelCls} absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 p-4`}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">{session.display_name}</p>
            <span
              className={`flex items-center gap-1.5 text-xs ${
                session.status === "live"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {session.status === "live" && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              )}
              {session.status}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div>
              <dd className="font-mono text-sm font-semibold">
                {formatDistance(session.distance_meters, session.units)}
              </dd>
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                Distance
              </dt>
            </div>
            <div>
              <dd className="font-mono text-sm font-semibold">
                {formatDuration(session.duration_seconds)}
              </dd>
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                Time
              </dt>
            </div>
            <div>
              <dd className="font-mono text-sm font-semibold">
                {formatPace(
                  session.distance_meters,
                  session.duration_seconds,
                  session.units
                )}
              </dd>
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                Pace
              </dt>
            </div>
            <div>
              <dd className="font-mono text-sm font-semibold">
                {formatElevation(session.elevation_gain_meters, session.units)}
              </dd>
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                Climb
              </dt>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
