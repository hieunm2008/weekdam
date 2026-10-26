import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
const script = resolve("tools/validate-deploy.mjs");
const directories: string[] = [];
function validate(
  project: string,
  selected = project,
  sandbox = "true",
  emulator: string | null = "false",
) {
  const root = resolve(".tmp");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "deploy-"));
  directories.push(directory);
  writeFileSync(
    join(directory, ".firebaserc"),
    JSON.stringify({ projects: { default: selected } }),
  );
  const env = {
    ...process.env,
    VITE_FIREBASE_PRO_SANDBOX: sandbox,
    VITE_FIREBASE_API_KEY: "key",
    VITE_FIREBASE_AUTH_DOMAIN: "host",
    VITE_FIREBASE_PROJECT_ID: project,
    VITE_FIREBASE_APP_ID: "app",
  };
  if (emulator === null) delete env.VITE_USE_FIREBASE_EMULATORS;
  else env.VITE_USE_FIREBASE_EMULATORS = emulator;
  return spawnSync(process.execPath, [script], {
    cwd: directory,
    encoding: "utf8",
    env,
  });
}
afterEach(() =>
  directories
    .splice(0)
    .forEach((directory) =>
      rmSync(directory, { recursive: true, force: true }),
    ),
);
it("blocks deployment to the existing project even with an explicit sandbox flag", () => {
  const result = validate("weekdam-hieu-2026");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("weekdam-hieu-2026");
});
it("requires sandbox confirmation and matching CLI/frontend projects", () => {
  expect(
    validate("weekdam-pro-sandbox", "weekdam-pro-sandbox", "false").status,
  ).not.toBe(0);
  expect(validate("weekdam-pro-sandbox", "other-sandbox").status).not.toBe(0);
  expect(validate("weekdam-pro-sandbox").status).toBe(0);
});
it("requires emulator mode to be explicitly disabled before a cloud deployment", () => {
  expect(
    validate("weekdam-pro-sandbox", "weekdam-pro-sandbox", "true", null).status,
  ).not.toBe(0);
  expect(
    validate("weekdam-pro-sandbox", "weekdam-pro-sandbox", "true", "true")
      .status,
  ).not.toBe(0);
});
