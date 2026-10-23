import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "weekdam",
        short_name: "weekdam",
        description: "Your week, one small step at a time.",
        theme_color: "#f4f0e8",
        background_color: "#f4f0e8",
        display: "standalone",
        id: "/",
        start_url: "/app",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        importScripts: ["/pomodoro-notifications.js"],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/__\//, /^\/tests\/fixtures\//],
      },
    }),
  ],
  build: {
    target: "es2022",
    ...(loadEnv(mode, process.cwd()).VITE_USE_FIREBASE_EMULATORS === "true" ||
    process.env.VITE_USE_FIREBASE_EMULATORS === "true"
      ? {
          rollupOptions: {
            input: {
              app: resolve("index.html"),
              auth: resolve("tests/fixtures/auth.html"),
            },
          },
        }
      : {}),
  },
}));
