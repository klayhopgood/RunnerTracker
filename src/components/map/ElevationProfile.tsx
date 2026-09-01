"use client";

import { useMemo } from "react";
import { haversineMeters } from "@/lib/geo";
import { formatElevation, type Units } from "@/lib/format";

const W = 100;
const H = 32;
/** Don't let a few metres of noise fill the whole chart height. */
const MIN_RANGE_M = 8;

type ElevationProfileProps = {
  /** [lng, lat, elevationMeters] triples in track order. */
  points: Array<[number, number, number]>;
  units: Units;
};

export function ElevationProfile({ points, units }: ElevationProfileProps) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const distances: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      distances.push(
        distances[i - 1]! +
          haversineMeters(points[i - 1]![1], points[i - 1]![0], points[i]![1], points[i]![0])
      );
    }
    const total = distances[distances.length - 1]!;
    if (total <= 0) return null;

    const elevations = points.map((p) => p[2]);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const mid = (min + max) / 2;
    const range = Math.max(max - min, MIN_RANGE_M);
    const lo = mid - range / 2;

    const coords = points.map((p, i) => {
      const x = (distances[i]! / total) * W;
      const y = H - ((p[2] - lo) / range) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return {
      line: `M${coords.join(" L")}`,
      area: `M${coords.join(" L")} L${W},${H} L0,${H} Z`,
      min,
      max,
    };
  }, [points]);

  if (!chart) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-zinc-500">
        <span>Elevation</span>
        <span className="font-mono normal-case">
          {formatElevation(chart.min, units)} – {formatElevation(chart.max, units)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-1 h-10 w-full"
        aria-label="Elevation profile"
        role="img"
      >
        <path d={chart.area} className="fill-emerald-500/20" />
        <path
          d={chart.line}
          className="stroke-emerald-500"
          fill="none"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
