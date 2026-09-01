"use client";

/**
 * Bridge to the Capacitor shell app (native/). When the site runs inside the
 * RunnerTracker Android app, the injected Capacitor bridge exposes the
 * @capacitor-community/background-geolocation plugin, which keeps GPS
 * streaming with the screen locked or other apps in front — the one thing
 * mobile browsers cannot do.
 */

export type NativePoint = {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  registerPlugin?: (name: string) => BackgroundGeolocationPlugin;
};

type WatcherOptions = {
  backgroundTitle: string;
  backgroundMessage: string;
  requestPermissions: boolean;
  stale: boolean;
  distanceFilter: number;
};

type PluginLocation = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  bearing: number | null;
  time: number | null;
};

type PluginError = { message?: string; code?: string };

type BackgroundGeolocationPlugin = {
  addWatcher: (
    options: WatcherOptions,
    callback: (location?: PluginLocation, error?: PluginError) => void
  ) => Promise<string>;
  removeWatcher: (options: { id: string }) => Promise<void>;
  openSettings: () => Promise<void>;
};

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when the site is running inside the native shell app. */
export function isNativeApp(): boolean {
  return !!capacitor()?.isNativePlatform?.();
}

/**
 * Starts a native background GPS watcher. Returns a stop function.
 * Only call when isNativeApp() is true.
 */
export function watchNativeLocation(
  onPoint: (point: NativePoint) => void,
  onError: (message: string) => void
): () => void {
  const plugin = capacitor()?.registerPlugin?.("BackgroundGeolocation");
  if (!plugin) {
    onError("Native GPS unavailable");
    return () => {};
  }

  let watcherId: string | null = null;
  let stopped = false;

  plugin
    .addWatcher(
      {
        backgroundTitle: "RunnerTracker is live",
        backgroundMessage:
          "Recording your run — GPS keeps going with your phone locked.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 3,
      },
      (location, error) => {
        if (error) {
          if (error.code === "NOT_AUTHORIZED") {
            onError(
              'Location permission needed — set it to "Allow all the time", then restart the run.'
            );
            plugin.openSettings().catch(() => {});
          } else {
            onError(error.message ?? "GPS error");
          }
          return;
        }
        if (!location) return;
        onPoint({
          lat: location.latitude,
          lng: location.longitude,
          altitude: location.altitude ?? null,
          accuracy: location.accuracy ?? null,
          speed: location.speed ?? null,
          heading: location.bearing ?? null,
          recordedAt: new Date(location.time ?? Date.now()).toISOString(),
        });
      }
    )
    .then((id) => {
      // The watcher may have been stopped before registration resolved.
      if (stopped) plugin.removeWatcher({ id }).catch(() => {});
      else watcherId = id;
    });

  return () => {
    stopped = true;
    if (watcherId) plugin.removeWatcher({ id: watcherId }).catch(() => {});
  };
}
