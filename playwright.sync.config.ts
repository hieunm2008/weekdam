import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sync-e2e",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4280",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "npm run build -- --mode development && npm run preview -- --port 4280",
    url: "http://127.0.0.1:4280",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: "true",
      VITE_FIREBASE_PROJECT_ID: "demo-weekdam",
    },
  },
});
