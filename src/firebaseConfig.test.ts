import { expect, it } from "vitest";
import { resolveFirebaseConfig } from "./firebaseConfig";

it("defaults to the isolated Pro emulator and refuses the existing production project", () => {
  expect(resolveFirebaseConfig({})).toMatchObject({
    emulatorMode: true,
    configured: true,
    projectId: "demo-weekdam-pro",
  });
  expect(
    resolveFirebaseConfig({
      VITE_FIREBASE_PROJECT_ID: "weekdam-hieu-2026",
      VITE_USE_FIREBASE_EMULATORS: "true",
    }).configured,
  ).toBe(false);
  expect(
    resolveFirebaseConfig({
      VITE_FIREBASE_PROJECT_ID: "weekdam-hieu-2026",
      VITE_USE_FIREBASE_EMULATORS: "false",
      VITE_FIREBASE_PRO_SANDBOX: "true",
      VITE_FIREBASE_API_KEY: "key",
      VITE_FIREBASE_AUTH_DOMAIN: "host",
      VITE_FIREBASE_APP_ID: "app",
    }).configured,
  ).toBe(false);
});
it("requires an explicit, complete sandbox cloud configuration", () => {
  const cloud = {
    VITE_USE_FIREBASE_EMULATORS: "false",
    VITE_FIREBASE_PROJECT_ID: "weekdam-pro-sandbox",
    VITE_FIREBASE_API_KEY: "key",
    VITE_FIREBASE_AUTH_DOMAIN: "host",
    VITE_FIREBASE_APP_ID: "app",
  };
  expect(resolveFirebaseConfig(cloud).configured).toBe(false);
  expect(
    resolveFirebaseConfig({ ...cloud, VITE_FIREBASE_PRO_SANDBOX: "true" })
      .configured,
  ).toBe(true);
  expect(
    resolveFirebaseConfig({
      ...cloud,
      VITE_FIREBASE_PRO_SANDBOX: "true",
      VITE_FIREBASE_APP_ID: "",
    }).configured,
  ).toBe(false);
});
