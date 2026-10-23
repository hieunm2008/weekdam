const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vi = require("../src/locales/vi.json");
const en = require("../src/locales/en.json");

const origin = new URL(process.argv[2] || "https://weekdam-hieu-2026.web.app")
  .origin;
const output = path.resolve(__dirname, "../docs/design/pomodoro-v1/production");

async function button(page, label) {
  return page
    .getByRole("button", { name: label, exact: true })
    .filter({ visible: true });
}

async function readGuestState(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(["plans", "meta"], "readonly");
      const read = (store, key) =>
        new Promise((resolve, reject) => {
          const request = transaction.objectStore(store).get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const [plan, runtime] = await Promise.all([
        read("plans", "guest"),
        read("meta", "pomodoro:guest"),
      ]);
      return { runtime, sessions: plan?.pomodoroSessions || [] };
    } finally {
      db.close();
    }
  });
}

async function screenshot(page, filename) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.screenshot({
    path: path.join(output, "screens", filename),
    fullPage: true,
  });
}

async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport,
    `Horizontal overflow: ${JSON.stringify(dimensions)}`,
  );
  return dimensions;
}

async function endpoint(relative) {
  const response = await fetch(new URL(relative, origin));
  assert.equal(response.status, 200, `${relative} must return HTTP 200`);
  return response;
}

async function main() {
  await fs.mkdir(path.join(output, "screens"), { recursive: true });
  const report = {
    origin,
    checkedAt: new Date().toISOString(),
    scope:
      "Fresh Guest contexts only; no cloud login, notification permission request, clock manipulation or shortened session",
    checks: [],
    pageErrors: [],
    status: "failed",
  };
  let browser;
  let desktop;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "vi-VN",
      timezoneId: "Asia/Ho_Chi_Minh",
    });
    desktop = await context.newPage();
    desktop.on("pageerror", (error) => report.pageErrors.push(error.message));
    const response = await desktop.goto(new URL("/app#pomodoro", origin).href);
    assert.equal(response.status(), 200);
    const pomodoro = desktop.getByTestId("pomodoro-page");
    await expect(pomodoro).toBeVisible();
    await expect(pomodoro.getByRole("timer")).toHaveText("25:00");
    await expect(
      desktop.getByLabel(vi.pomodoroTask, { exact: true }),
    ).toHaveValue("");
    await expect(
      desktop.getByRole("checkbox", { name: vi.pomodoroSound, exact: true }),
    ).toBeChecked();
    await expect(
      desktop.getByRole("checkbox", {
        name: vi.pomodoroNotifications,
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(
      desktop.getByTestId("pomodoro-history").locator("[data-session-id]"),
    ).toHaveCount(0);
    await screenshot(desktop, "pomodoro-production-desktop-ready.png");
    report.checks.push(
      "Direct /app#pomodoro, 25:00 default, free focus, sound on, notifications off and empty Guest history",
    );

    const start = await button(desktop, vi.pomodoroStart);
    await start.focus();
    await desktop.keyboard.press("Enter");
    await expect(await button(desktop, vi.pomodoroPause)).toBeVisible();
    await expect(pomodoro.getByRole("timer")).not.toHaveText("25:00");
    await (await button(desktop, vi.pomodoroPause)).click();
    await expect(await button(desktop, vi.pomodoroResume)).toBeVisible();
    const paused = await readGuestState(desktop);
    assert.equal(paused.runtime.status, "paused");
    assert.ok(paused.runtime.elapsedMs > 0);
    assert.equal(paused.runtime.plannedDurationMs, 25 * 60_000);
    const pausedTime = await pomodoro.getByRole("timer").textContent();
    await desktop.reload();
    await expect(desktop.getByTestId("pomodoro-page")).toBeVisible();
    await expect(await button(desktop, vi.pomodoroResume)).toBeVisible();
    await expect(desktop.getByRole("timer")).toHaveText(pausedTime);
    const restored = await readGuestState(desktop);
    assert.equal(restored.runtime.sessionId, paused.runtime.sessionId);
    assert.equal(restored.runtime.elapsedMs, paused.runtime.elapsedMs);
    await screenshot(desktop, "pomodoro-production-desktop-paused.png");
    report.checks.push(
      "Keyboard start, real countdown, pause and reload restore the same session without accruing paused time",
    );

    await (await button(desktop, vi.pomodoroResume)).click();
    await expect(await button(desktop, vi.pomodoroPause)).toBeVisible();
    await (await button(desktop, vi.plan)).click();
    const bar = desktop.getByTestId("pomodoro-minibar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText(vi.pomodoroFree);
    await expect(
      bar.getByRole("button", { name: vi.pomodoroPause, exact: true }),
    ).toBeVisible();
    await (await button(desktop, vi.calendarView)).click();
    await expect(
      desktop.getByRole("region", { name: vi.calendarWeekLabel, exact: true }),
    ).toBeVisible();
    await expect(bar).toBeVisible();
    await bar
      .getByRole("button", { name: vi.pomodoroPause, exact: true })
      .click();
    await expect(
      bar.getByRole("button", { name: vi.pomodoroResume, exact: true }),
    ).toBeVisible();
    const pausedAgain = await readGuestState(desktop);
    assert.equal(pausedAgain.runtime.sessionId, paused.runtime.sessionId);
    assert.ok(pausedAgain.runtime.elapsedMs > paused.runtime.elapsedMs);
    await screenshot(desktop, "pomodoro-production-calendar-minibar.png");
    await bar
      .getByRole("button", { name: vi.pomodoroOpen, exact: true })
      .click();
    await expect(desktop.getByTestId("pomodoro-page")).toBeVisible();
    await expect(await button(desktop, vi.pomodoroResume)).toBeVisible();
    report.checks.push(
      "Resume, planner and calendar minibar, minibar pause and return to the same Pomodoro",
    );

    await (await button(desktop, vi.pomodoroStop)).click();
    await expect(await button(desktop, vi.pomodoroStart)).toBeVisible();
    const history = desktop
      .getByTestId("pomodoro-history")
      .locator("[data-session-id]");
    await expect(history).toHaveCount(1);
    await expect(history).toContainText(vi.pomodoroOutcome_stopped);
    const stopped = await readGuestState(desktop);
    assert.equal(stopped.sessions.length, 1);
    assert.equal(stopped.sessions[0].id, paused.runtime.sessionId);
    assert.equal(stopped.sessions[0].outcome, "stopped");
    assert.equal(
      stopped.sessions[0].focusedDurationMs,
      pausedAgain.runtime.elapsedMs,
    );
    assert.equal(stopped.sessions[0].plannedDurationMs, 25 * 60_000);
    assert.ok(
      stopped.sessions[0].focusedDurationMs <
        stopped.sessions[0].plannedDurationMs,
    );
    assert.equal(stopped.runtime.completedInCycle, 0);
    await desktop.reload();
    await expect(desktop.getByTestId("pomodoro-page")).toBeVisible();
    await expect(
      desktop.getByTestId("pomodoro-history").locator("[data-session-id]"),
    ).toHaveCount(1);
    assert.deepEqual(
      (await readGuestState(desktop)).sessions,
      stopped.sessions,
    );
    await screenshot(desktop, "pomodoro-production-desktop-history.png");
    report.stoppedSession = {
      plannedDurationMs: stopped.sessions[0].plannedDurationMs,
      focusedDurationMs: stopped.sessions[0].focusedDurationMs,
      outcome: stopped.sessions[0].outcome,
    };
    report.checks.push(
      "Stopping saves one partial session with actual focus excluding pauses; reload preserves history and cycle stays zero",
    );

    const mobile = await browser.newContext({
      viewport: { width: 320, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: "en-GB",
      timezoneId: "Asia/Ho_Chi_Minh",
    });
    await mobile.addInitScript(() => {
      localStorage.setItem("weekdam:language", "en");
      localStorage.setItem("weekdam:theme", "dark");
    });
    const phone = await mobile.newPage();
    phone.on("pageerror", (error) => report.pageErrors.push(error.message));
    await phone.goto(new URL("/app#pomodoro", origin).href);
    await expect(phone.getByTestId("pomodoro-page")).toBeVisible();
    await expect(phone.getByRole("timer")).toHaveText("25:00");
    await expect(await button(phone, en.pomodoroStart)).toBeVisible();
    await expect(phone.locator("html")).toHaveAttribute("lang", "en");
    await expect(phone.locator("html")).toHaveAttribute("data-theme", "dark");
    report.mobileLayout = await noOverflow(phone);
    await screenshot(phone, "pomodoro-production-mobile-en-dark.png");
    await (await button(phone, en.pomodoroStart)).click();
    await expect(await button(phone, en.pomodoroPause)).toBeVisible();
    await (await button(phone, en.pomodoroPause)).click();
    await expect(await button(phone, en.pomodoroResume)).toBeVisible();
    await (await button(phone, en.plan)).click();
    const mobileBar = phone.getByTestId("pomodoro-minibar");
    await expect(mobileBar).toBeVisible();
    await expect(
      mobileBar.getByRole("button", { name: en.pomodoroResume, exact: true }),
    ).toBeVisible();
    report.mobileMinibarLayout = await noOverflow(phone);
    await screenshot(phone, "pomodoro-production-mobile-minibar-en-dark.png");
    await mobileBar
      .getByRole("button", { name: en.pomodoroStop, exact: true })
      .click();
    await expect(mobileBar).toHaveCount(0);
    report.checks.push(
      "320px English/dark Pomodoro and active planner minibar have no horizontal overflow",
    );

    const manifest = await (await endpoint("/manifest.webmanifest")).json();
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.id, "/");
    assert.equal(manifest.start_url, "/app");
    assert.ok(manifest.icons.length > 0);
    const workerResponse = await endpoint("/pomodoro-notifications.js");
    assert.match(
      workerResponse.headers.get("content-type") || "",
      /javascript/i,
    );
    const worker = await workerResponse.text();
    assert.match(worker, /notificationclick/);
    assert.ok(worker.includes("/app#pomodoro"));
    assert.ok(!worker.includes("<html"));
    const serviceWorker = await (await endpoint("/sw.js")).text();
    assert.ok(serviceWorker.includes("pomodoro-notifications.js"));
    assert.ok(!serviceWorker.includes("tests/fixtures/auth.html"));
    report.checks.push(
      "Production PWA manifest and service-worker notification handler are served correctly; no auth Emulator fixture precached",
    );
    assert.deepEqual(report.pageErrors, []);
    report.checks.push("No page errors in desktop or mobile Guest contexts");
    report.status = "passed";
  } catch (error) {
    report.error = error.stack || String(error);
    if (desktop && !desktop.isClosed()) {
      await screenshot(desktop, "pomodoro-production-failure.png").catch(
        () => {},
      );
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await fs.writeFile(
      path.join(output, "pomodoro-production-smoke.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
