import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { PomodoroRuntime } from "../../src/pomodoro";

const appURL = "http://127.0.0.1:4280";

async function openTimer(page: Page) {
  await page
    .getByRole("button", { name: "Pomodoro", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
}

async function storedRuntime(
  page: Page,
  scope: string,
): Promise<PomodoroRuntime | undefined> {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<PomodoroRuntime | undefined>(
        (resolve, reject) => {
          const request = db
            .transaction("meta")
            .objectStore("meta")
            .get(`pomodoro:${key}`);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
    } finally {
      db.close();
    }
  }, scope);
}

async function switchAccount(
  context: BrowserContext,
  original: Page,
  uid: string,
) {
  // Playwright's clock controls every page in this context, including auth.
  await original.clock.resume();
  const authTab = await context.newPage();
  try {
    // Keep the original app alive so it has to pause its own preceding scope.
    await authTab.route(`${appURL}/app`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Authentication complete</title>",
      }),
    );
    await authTab.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
    await authTab.waitForURL(`${appURL}/app`);
    await expect(original.getByTestId("sync-status")).toContainText(
      "Đã đồng bộ",
      {
        timeout: 15_000,
      },
    );
  } finally {
    await authTab.close();
  }
}

async function shortenFocus(page: Page, minutes: string) {
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill(minutes);
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText(`0${minutes}:00`);
}

async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 1000));
}

test("pauses Guest on login and restores its paused timer and settings after sign-out", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    baseURL: appURL,
    serviceWorkers: "block",
  });
  const uid = `pomodoro-active-guest-${Date.now()}`;
  try {
    const page = await context.newPage();
    const start = new Date();
    await page.clock.install({ time: start });
    await page.goto(`${appURL}/app`);
    await openTimer(page);
    await shortenFocus(page, "1");
    await page
      .getByRole("checkbox", { name: "Chuông khi hết giờ", exact: true })
      .click();
    await expect(
      page.getByRole("checkbox", { name: "Chuông khi hết giờ", exact: true }),
    ).not.toBeChecked();
    await pauseClock(page);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Tạm dừng", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(10_000);
    await switchAccount(context, page, uid);
    await expect(page.getByRole("timer")).toHaveText("25:00");
    await expect(
      page.getByRole("button", { name: "Bắt đầu", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => storedRuntime(page, "guest"))
      .toMatchObject({
        status: "paused",
        plannedDurationMs: 60_000,
        settings: { focusMinutes: 1, sound: false },
      });
    const guestRuntime = (await storedRuntime(page, "guest"))!;
    expect(guestRuntime.elapsedMs).toBeGreaterThanOrEqual(10_000);
    expect(guestRuntime.elapsedMs).toBeLessThan(60_000);
    await expect(
      page.getByTestId("pomodoro-history").locator("[data-session-id]"),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Cài đặt", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Tiếp tục", exact: true }),
    ).toBeVisible();
    const pausedTimer = await page.getByRole("timer").innerText();
    await expect(
      page.getByRole("checkbox", { name: "Chuông khi hết giờ", exact: true }),
    ).not.toBeChecked();
    await page.clock.runFor(120_000);
    await expect(page.getByRole("timer")).toHaveText(pausedTimer);
    expect(await storedRuntime(page, "guest")).toMatchObject({
      status: "paused",
      sessionId: guestRuntime.sessionId,
      elapsedMs: guestRuntime.elapsedMs,
    });
    await expect(
      page.getByTestId("pomodoro-history").locator("[data-session-id]"),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("pauses the previous signed-in account and isolates another account before restoring the old timer", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    baseURL: appURL,
    serviceWorkers: "block",
  });
  const firstUID = `pomodoro-active-account-${Date.now()}`;
  try {
    const page = await context.newPage();
    const start = new Date();
    await page.clock.install({ time: start });
    await page.goto(`${appURL}/app`);
    await switchAccount(context, page, firstUID);
    await openTimer(page);
    await shortenFocus(page, "2");
    await pauseClock(page);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Tạm dừng", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(8_000);
    await switchAccount(context, page, `${firstUID}-other`);
    await expect(page.getByRole("timer")).toHaveText("25:00");
    await expect(
      page.getByRole("button", { name: "Bắt đầu", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => storedRuntime(page, `account:demo-weekdam:${firstUID}`))
      .toMatchObject({
        status: "paused",
        plannedDurationMs: 120_000,
        settings: { focusMinutes: 2 },
      });
    const accountScope = `account:demo-weekdam:${firstUID}`;
    const accountRuntime = (await storedRuntime(page, accountScope))!;
    expect(accountRuntime.elapsedMs).toBeGreaterThanOrEqual(8_000);
    expect(accountRuntime.elapsedMs).toBeLessThan(120_000);
    await expect(
      page.getByTestId("pomodoro-history").locator("[data-session-id]"),
    ).toHaveCount(0);
    await switchAccount(context, page, firstUID);
    await expect(
      page.getByRole("button", { name: "Tiếp tục", exact: true }),
    ).toBeVisible();
    const pausedTimer = await page.getByRole("timer").innerText();
    await expect(
      page.getByLabel("Tập trung (phút)", { exact: true }),
    ).toHaveValue("2");
    await page.clock.runFor(120_000);
    await expect(page.getByRole("timer")).toHaveText(pausedTimer);
    expect(await storedRuntime(page, accountScope)).toMatchObject({
      status: "paused",
      sessionId: accountRuntime.sessionId,
      elapsedMs: accountRuntime.elapsedMs,
    });
  } finally {
    await context.close();
  }
});
