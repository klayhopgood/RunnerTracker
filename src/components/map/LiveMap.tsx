"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const TRAIL_COLOR = "#34d399";

function trailSourceId(sessionId: string) {
  return `trail-${sessionId}`;
}

export function LiveMap() {
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const trailsRef = useRef(new Map<string, [number, number][]>());
  const runnersRef = useRef(new Map<string, LiveRunner>());
  const [selected, setSelected] = useState<LiveRunner | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  const upsertMarker = useCallback((runner: LiveRunner) => {
    const map = mapRef.current;
    if (!map || !runner.lastPoint) return;
    const { lat, lng } = runner.lastPoint;

    let marker = markersRef.current.get(runner.sessionId);
    if (!marker) {
      const el = document.createElement("button");
      el.setAttribute("aria-label", `Runner ${runner.displayName}`);
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#34d399;border:3px solid #052e22;box-shadow:0 0 0 4px rgba(52,211,153,.35);cursor:pointer";
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

  const appendTrail = useCallback((sessionId: string, lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const coords = trailsRef.current.get(sessionId) ?? [];
    coords.push([lng, lat]);
    trailsRef.current.set(sessionId, coords);

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
    setLiveCount(runnersRef.current.size);
    setSelected((cur) => (cur?.sessionId === sessionId ? null : cur));
  }, []);

  const handleMapReady = useCallback(
    async (map: MaplibreMap) => {
      mapRef.current = map;
      map.on("click", () => setSelected(null));

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
          for (const [lng, lat] of coordinates ?? []) {
            appendTrail(runner.sessionId, lng, lat);
          }
        }
        setLiveCount(runnersRef.current.size);
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
    [appendTrail, upsertMarker]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(PUBLIC_LIVE_CHANNEL)
      .on("broadcast", { event: "location_update" }, ({ payload }) => {
        const update = payload as LocationBroadcast;
        const existing = runnersRef.current.get(update.sessionId);
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
        setLiveCount(runnersRef.current.size);
        setSelected((cur) =>
          cur?.sessionId === update.sessionId ? { ...runner } : cur
        );
      })
      .on("broadcast", { event: "session_stopped" }, ({ payload }) => {
        removeRunner((payload as { sessionId: string }).sessionId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appendTrail, removeRunner, upsertMarker]);

  return (
    <>
      <MapView onMapReady={handleMapReady} />

      <div className="pointer-events-none absolute bottom-6 left-6 max-w-xs rounded-xl bg-black/50 p-4 text-sm text-zinc-200 backdrop-blur">
        {liveCount > 0 ? (
          <p className="font-medium text-white">
            {liveCount} runner{liveCount === 1 ? "" : "s"} live now — tap a pin
            for stats
          </p>
        ) : (
          <>
            <p className="font-medium text-white">No public runs right now</p>
            <p className="mt-1 text-zinc-400">
              Live runners appear here the moment they start.
            </p>
          </>
        )}
      </div>

      {selected && (
        <div className="absolute right-4 top-16 w-72 rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 text-sm text-zinc-200 backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-white">{selected.displayName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-500 hover:text-white"
              aria-label="Close stats"
            >
              ✕
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs text-zinc-500">Distance</dt>
              <dd className="font-medium text-white">
                {formatDistance(selected.distanceMeters, selected.units)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Duration</dt>
              <dd className="font-medium text-white">
                {formatDuration(selected.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Avg pace</dt>
              <dd className="font-medium text-white">
                {formatPace(
                  selected.distanceMeters,
                  selected.durationSeconds,
                  selected.units
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Elevation gain</dt>
              <dd className="font-medium text-white">
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
