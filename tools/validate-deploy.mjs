import { loadEnv } from "vite";
import fs from "node:fs";
const env = loadEnv("production", process.cwd(), "VITE_");
const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];
const missing = required.filter((key) => !env[key]);
if (missing.length)
  throw new Error("Production Firebase config missing: " + missing.join(", "));
if (
  env.VITE_USE_FIREBASE_EMULATORS === "true" ||
  env.VITE_FIREBASE_PROJECT_ID.startsWith("demo-")
)
  throw new Error("An emulator build cannot be deployed");
if (!fs.existsSync(".firebaserc"))
  throw new Error(
    "Select the real Firebase project using npx firebase use --add",
  );
const project = JSON.parse(fs.readFileSync(".firebaserc", "utf8")).projects
  ?.default;
if (project !== env.VITE_FIREBASE_PROJECT_ID)
  throw new Error("Firebase CLI project and frontend project must match");
console.log("Production configuration matches selected Firebase project");
