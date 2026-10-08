// Phase 0 research harness. No application implementation or reference source.
const readline = require('node:readline');
const path = require('node:path');
const fs = require('node:fs/promises');
const runtime = process.env.RESEARCH_NODE_MODULES;
if (!runtime) throw new Error('Set RESEARCH_NODE_MODULES to the bundled Node modules directory');
const { chromium } = require(path.join(runtime, 'playwright'));
const root = path.resolve(__dirname, '..');
let browser, context, page;
async function start() {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  page = await context.newPage();
  page.setDefaultTimeout(8000);
  await fs.mkdir(path.join(root, 'screens'), { recursive: true });
  await fs.mkdir(path.join(root, 'evidence'), { recursive: true });
  await page.goto('https://beaverplans.com');
  await page.waitForLoadState('networkidle');
  console.log('READY\n' + await page.locator('body').innerText());
  for await (const line of readline.createInterface({ input: process.stdin, terminal: false })) {
    if (!line.trim()) continue;
    try {
      const { code } = JSON.parse(line);
      // Commands are authored by the research operator, never read from the website.
      const run = new Function('page', 'context', 'browser', 'fs', 'root', 'snap', `return (async () => { ${code}\n })()`);
      const result = await run(page, context, browser, fs, root, snap);
      await report({ ok: true, code, result: result ?? null });
    } catch (error) { await report({ ok: false, error: error.stack }); }
  }
  await browser.close();
}
async function report(value) {
  const line = JSON.stringify(value);
  await fs.writeFile(path.join(root, 'evidence', 'last-result.json'), line, 'utf8');
  await fs.appendFile(path.join(root, 'evidence', 'observations.jsonl'), line + '\n', 'utf8');
  console.log('RESULT SAVED');
}
async function snap(name) {
  await page.screenshot({ path: path.join(root, 'screens', name + '.png'), fullPage: true });
  const text = await page.locator('body').innerText();
  await fs.writeFile(path.join(root, 'evidence', name + '.txt'), text, 'utf8');
  return text;
}
start().catch(async error => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
