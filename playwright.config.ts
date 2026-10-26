import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
  },
  webServer: {
    // Exercise the real PWA and code-split production assets. Explicitly disable
    // Firebase in guest UI tests so they never connect to a cloud or emulator.
    command:
      "npm run build -- --outDir .tmp/dist-ui && node tools/serve-dist.mjs --dir .tmp/dist-ui --port 4173",
    env: {
      VITE_USE_FIREBASE_EMULATORS: "false",
      VITE_FIREBASE_PRO_SANDBOX: "false",
    },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
