/** Suggested run name from the current local time, e.g. "Tuesday evening run". */
export function defaultRunName(now = new Date()): string {
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const hour = now.getHours();
  const timeOfDay =
    hour < 5
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "night";
  return `${weekday} ${timeOfDay} run`;
}
