export type Units = "metric" | "imperial";

export function formatDistance(meters: number, units: Units): string {
  if (units === "imperial") {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatElevation(meters: number, units: Units): string {
  if (units === "imperial") {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Average pace, e.g. "5:12 /km". */
export function formatPace(
  meters: number,
  seconds: number,
  units: Units
): string {
  if (meters < 10 || seconds <= 0) return "—";
  const perUnit =
    units === "imperial" ? seconds / (meters / 1609.344) : seconds / (meters / 1000);
  const m = Math.floor(perUnit / 60);
  const s = Math.round(perUnit % 60);
  return `${m}:${String(s).padStart(2, "0")} /${units === "imperial" ? "mi" : "km"}`;
}
