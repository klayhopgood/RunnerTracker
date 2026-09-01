"use client";

import { useCallback, useEffect, useState } from "react";
import type { Units } from "@/lib/format";

const STORAGE_KEY = "rt_units";
const UNITS_EVENT = "rt-units-change";

/**
 * Viewer-side unit preference (km/mi), shared across all components on the
 * page via a custom event and persisted in localStorage.
 */
export function useUnits(): [Units, (units: Units) => void] {
  const [units, setUnitsState] = useState<Units>("metric");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "imperial" || stored === "metric") setUnitsState(stored);

    const onChange = (event: Event) =>
      setUnitsState((event as CustomEvent<Units>).detail);
    window.addEventListener(UNITS_EVENT, onChange);
    return () => window.removeEventListener(UNITS_EVENT, onChange);
  }, []);

  const setUnits = useCallback((next: Units) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent(UNITS_EVENT, { detail: next }));
  }, []);

  return [units, setUnits];
}
