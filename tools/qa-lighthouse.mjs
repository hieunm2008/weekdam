import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import fs from "node:fs/promises";
await fs.mkdir("docs/validation", { recursive: true });
const chrome = await launch({ chromeFlags: ["--headless=new"] });
try {
  const result = await lighthouse("http://127.0.0.1:4173", {
    port: chrome.port,
    output: ["html", "json"],
    onlyCategories: ["performance", "accessibility", "best-practices"],
    formFactor: "mobile",
  });
  await fs.writeFile("docs/validation/lighthouse.html", result.report[0]);
  await fs.writeFile("docs/validation/lighthouse.json", result.report[1]);
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
} finally {
  await chrome.kill();
}
