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
  Plugins?: Record<string, BackgroundGeolocationPlugin | undefined>;
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
  // The bridge injected by the shell app generates callback-style methods
  // that return the watcher id synchronously; the full @capacitor/core
  // runtime returns a Promise. Support both.
  addWatcher: (
    options: WatcherOptions,
    callback: (location?: PluginLocation, error?: PluginError) => void
  ) => string | Promise<string>;
  removeWatcher: (options: { id: string }) => Promise<void>;
  openSettings: () => Promise<void>;
};

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor;
}

function backgroundGeolocation(): BackgroundGeolocationPlugin | undefined {
  const cap = capacitor();
  if (!cap) return undefined;
  // The injected native bridge exposes plugins only on Capacitor.Plugins;
  // registerPlugin exists only when @capacitor/core is bundled with the page
  // (it is not — the site is loaded remotely via server.url).
  return cap.Plugins?.BackgroundGeolocation ?? cap.registerPlugin?.("BackgroundGeolocation");
}

/** True when the site is running inside the native shell app. */
export function isNativeApp(): boolean {
  return !!capacitor()?.isNativePlatform?.();
}

/**
 * Invokes onReady once the native bridge is available. The shell app can
 * inject the bridge after page load (document-start injection has known
 * failure modes on Android), so a single mount-time isNativeApp() check can
 * miss it. Returns a cleanup function.
 */
export function watchNativeApp(onReady: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (isNativeApp()) {
    onReady();
    return () => {};
  }

  let interval: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    if (interval) clearInterval(interval);
    if (timeout) clearTimeout(timeout);
    document.removeEventListener("capacitor-bridge-ready", check);
  }

  function check() {
    if (!isNativeApp()) return;
    cleanup();
    onReady();
  }

  // The shell app dispatches capacitor-bridge-ready after a late injection;
  // the interval covers bridges that arrive without the event.
  document.addEventListener("capacitor-bridge-ready", check);
  interval = setInterval(check, 250);
  timeout = setTimeout(cleanup, 15000);
  return cleanup;
}

/**
 * Starts a native background GPS watcher. Returns a stop function.
 * Only call when isNativeApp() is true.
 */
export function watchNativeLocation(
  onPoint: (point: NativePoint) => void,
  onError: (message: string) => void
): () => void {
  const plugin = backgroundGeolocation();
  if (!plugin) {
    onError("Native GPS unavailable");
    return () => {};
  }

  let watcherId: string | null = null;
  let stopped = false;

  Promise.resolve(
    plugin.addWatcher(
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
  ).then((id) => {
    // The watcher may have been stopped before registration resolved.
    if (stopped) plugin.removeWatcher({ id }).catch(() => {});
    else watcherId = id;
  });

  return () => {
    stopped = true;
    if (watcherId) plugin.removeWatcher({ id: watcherId }).catch(() => {});
  };
}
