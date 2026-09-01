export const PUBLIC_LIVE_CHANNEL = "live:public";

export function trackChannel(slug: string): string {
  return `track:${slug}`;
}

export type LocationBroadcast = {
  sessionId: string;
  slug: string;
  displayName: string;
  lat: number;
  lng: number;
  elevation: number | null;
  speed: number | null;
  heading: number | null;
  distanceMeters: number;
  elevationGainMeters: number;
  durationSeconds: number;
  recordedAt: string;
  status: string;
};

/**
 * Server-side broadcast over Supabase Realtime's HTTP endpoint —
 * no websocket connection needed from the API route.
 */
export async function broadcast(
  topics: string[],
  event: string,
  payload: unknown
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: topics.map((topic) => ({ topic, event, payload })),
      }),
    });
  } catch (error) {
    console.error("Realtime broadcast failed:", error);
  }
}
