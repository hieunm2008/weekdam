import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Windows sandbox child processes must share a readable transform-cache path.
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = path.join(root, ".tmp", "vitest");
mkdirSync(temporary, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/vitest/vitest.mjs"),
    "run",
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary },
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
