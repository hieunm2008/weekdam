import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import fs from "node:fs/promises";
import path from "node:path";
const url = process.argv[2] || "http://127.0.0.1:4173";
const output = process.argv[3] || "docs/validation";
await fs.mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ["--headless=new"] });
try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: ["html", "json"],
    onlyCategories: ["performance", "accessibility", "best-practices"],
    formFactor: "mobile",
  });
  await fs.writeFile(path.join(output, "lighthouse.html"), result.report[0]);
  await fs.writeFile(path.join(output, "lighthouse.json"), result.report[1]);
  if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          value.score,
        ]),
      ),
      null,
      2,
    ),
  );
  if (
    result.lhr.categories.performance.score < 0.9 ||
    result.lhr.categories.accessibility.score < 1
  )
    process.exitCode = 1;
} finally {
  await chrome.kill();
}
