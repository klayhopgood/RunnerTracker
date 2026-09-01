import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.runnertracker.mobile",
  appName: "RunnerTracker",
  // The app is a thin native shell around the live site: web deploys update
  // the app instantly, and the injected Capacitor bridge gives the site
  // access to native background GPS.
  webDir: "www",
  server: {
    url: "https://www.runnertracker.app",
    androidScheme: "https",
  },
};

export default config;
