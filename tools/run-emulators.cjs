const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const env = { ...process.env };
const local = path.join(root, ".tools", "jdk");
if (!env.JAVA_HOME && fs.existsSync(local)) {
  const directory = fs
    .readdirSync(local)
    .find((name) =>
      fs.existsSync(
        path.join(
          local,
          name,
          "bin",
          process.platform === "win32" ? "java.exe" : "java",
        ),
      ),
    );
  if (directory) {
    const pathKey =
      Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
    env.JAVA_HOME = path.join(local, directory);
    env[pathKey] =
      path.join(env.JAVA_HOME, "bin") + path.delimiter + (env[pathKey] ?? "");
  }
}
const mode = process.argv[2];
const script =
  mode === "sync"
    ? "playwright test --config playwright.sync.config.ts"
    : "vitest run tests/rules.test.ts --config vitest.rules.config.ts";
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec",
    "--only",
    mode === "sync" ? "auth,firestore" : "firestore",
    "--project",
    "demo-weekdam",
    script,
  ],
  { cwd: root, env, stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
