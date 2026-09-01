"use client";

import { useUnits } from "@/lib/units";

const activeCls = "bg-emerald-500 font-medium text-black";
const idleCls =
  "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white";

export function UnitsToggle({ className = "" }: { className?: string }) {
  const [units, setUnits] = useUnits();

  return (
    <div
      className={`inline-flex overflow-hidden rounded-lg border border-zinc-300 text-xs dark:border-zinc-700 ${className}`}
      role="group"
      aria-label="Distance units"
    >
      <button
        type="button"
        onClick={() => setUnits("metric")}
        className={`px-2 py-1 ${units === "metric" ? activeCls : idleCls}`}
      >
        km
      </button>
      <button
        type="button"
        onClick={() => setUnits("imperial")}
        className={`px-2 py-1 ${units === "imperial" ? activeCls : idleCls}`}
      >
        mi
      </button>
    </div>
  );
}
