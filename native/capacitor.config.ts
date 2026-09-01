import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.runnertracker.mobile",
  appName: "RunnerTracker",
  // The app is a thin native shell around the live site: web deploys update
  // the app instantly, and the injected Capacitor bridge gives the site
  // access to native background GPS.
  webDir: "www",
  // UA marker so the site can tell it is running inside the shell app even
  // before the bridge lands; also the documented workaround for Capacitor
  // failing to inject into remote server.url pages (capacitor#7269).
  android: {
    appendUserAgent: "RunnerTrackerApp",
  },
  ios: {
    appendUserAgent: "RunnerTrackerApp",
  },
  server: {
    url: "https://www.runnertracker.app",
    androidScheme: "https",
  },
};

export default config;
