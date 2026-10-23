import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const appURL = "http://127.0.0.1:4280";
async function synced(page: Page) {
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 15_000,
  });
}
async function login(context: BrowserContext, uid: string) {
  const page = await context.newPage();
  await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
  await page.waitForURL(`${appURL}/app`);
  await synced(page);
  return page;
}
async function openTimer(page: Page) {
  await page
    .getByRole("button", { name: "Pomodoro", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
}
async function historyCount(page: Page, count: number) {
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(count, { timeout: 15_000 });
}

test("syncs stopped and completed focus, including an offline reload and reconnect", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const uid = `pomodoro-sync-${Date.now()}`;
  const a = await browser.newContext({ baseURL: appURL });
  const b = await browser.newContext({ baseURL: appURL });
  try {
    const first = await login(a, uid);
    const second = await login(b, uid);
    await first.clock.install({ time: new Date() });
    await first.reload();
    await synced(first);
    await openTimer(first);
    await openTimer(second);
    await first.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
    await first
      .getByRole("button", { name: "Lưu thời gian", exact: true })
      .click();
    await first.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await first.clock.runFor(10_000);
    await first
      .getByRole("button", { name: "Dừng phiên", exact: true })
      .click();
    await historyCount(first, 1);
    await synced(first);
    await historyCount(second, 1);
    await first.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await a.setOffline(true);
    await first.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await first.clock.runFor(60_100);
    await historyCount(first, 2);
    await first.reload();
    await openTimer(first);
    await historyCount(first, 2);
    await a.setOffline(false);
    await synced(first);
    await historyCount(second, 2);
    await expect(
      second.getByTestId("pomodoro-history").locator(".is-stopped"),
    ).toHaveCount(1);
    await expect(
      second.getByTestId("pomodoro-history").locator(".is-completed"),
    ).toHaveCount(1);
  } finally {
    await a.close();
    await b.close();
  }
});

test("uploads history-only Guest data on first login and isolates a different account", async ({
  browser,
}) => {
  test.setTimeout(75_000);
  const uid = `pomodoro-guest-${Date.now()}`;
  const context = await browser.newContext({ baseURL: appURL });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: new Date() });
    await page.goto(`${appURL}/app`);
    await openTimer(page);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await page.clock.runFor(12_000);
    await page.getByRole("button", { name: "Dừng phiên", exact: true }).click();
    await historyCount(page, 1);
    const guestSessionId = await page
      .getByTestId("pomodoro-history")
      .locator("[data-session-id]")
      .getAttribute("data-session-id");
    await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
    await page.waitForURL(`${appURL}/app`);
    await synced(page);
    await openTimer(page);
    await historyCount(page, 1);
    // A second account may import the retained Guest backup, but not sessions created in this account.
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await page.clock.runFor(10_000);
    await page.getByRole("button", { name: "Dừng phiên", exact: true }).click();
    await historyCount(page, 2);
    await synced(page);
    await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}-other`);
    await page.waitForURL(`${appURL}/app`);
    await synced(page);
    await openTimer(page);
    await historyCount(page, 1);
    await expect(page.getByRole("timer")).toHaveText("25:00");
    expect(
      await page
        .getByTestId("pomodoro-history")
        .locator("[data-session-id]")
        .getAttribute("data-session-id"),
    ).toBe(guestSessionId);
  } finally {
    await context.close();
  }
});

test("merges newly persisted Guest history when a different tab logs in without reloading the original app", async ({
  browser,
}) => {
  test.setTimeout(75_000);
  const context = await browser.newContext({
    baseURL: appURL,
    serviceWorkers: "block",
  });
  const uid = `pomodoro-guest-disk-${Date.now()}`;
  const session = {
    id: `guest-disk-session-${Date.now()}`,
    startedAt: 1_791_691_000_000,
    endedAt: 1_791_691_010_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 10_000,
    outcome: "stopped",
  };
  try {
    const original = await context.newPage();
    await original.goto(`${appURL}/app`);
    await original
      .getByRole("main")
      .getByRole("button", { name: "Tạo dự án", exact: true })
      .click();
    await original
      .getByLabel("Tên dự án", { exact: true })
      .fill("Memory Guest project");
    await original.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(
      original.getByRole("combobox", { name: "Lọc dự án", exact: true }),
    ).toContainText("Memory Guest project");
    await expect(original.getByTestId("sync-status")).toContainText(
      "Đã lưu trên thiết bị",
    );
    const authTab = await context.newPage();
    await authTab.goto(`${appURL}/robots.txt`);
    // Simulate a committed completion whose tab closed before broadcasting the update.
    await authTab.evaluate(async (newSession) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("weekdam-local", 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("plans", "readwrite");
          const store = tx.objectStore("plans");
          const request = store.get("guest");
          request.onsuccess = () => {
            const plan = request.result;
            if (
              !plan?.weeks?.some(
                (week: { projects: unknown[] }) => week.projects.length,
              )
            ) {
              tx.abort();
              reject(
                new Error(
                  "Guest project was not persisted before the regression fixture",
                ),
              );
              return;
            }
            store.put(
              {
                ...plan,
                pomodoroSessions: [
                  ...(plan.pomodoroSessions ?? []),
                  newSession,
                ],
              },
              "guest",
            );
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(tx.error ?? new Error("Guest fixture transaction aborted"));
        });
      } finally {
        db.close();
      }
    }, session);
    // Prevent a second app instance from migrating the disk session and masking the bug.
    await authTab.route(`${appURL}/app`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Authentication complete</title>",
      }),
    );
    await authTab.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
    await authTab.waitForURL(`${appURL}/app`);
    await synced(original);
    await expect(
      original.getByRole("combobox", { name: "Lọc dự án", exact: true }),
    ).toContainText("Memory Guest project");
    await openTimer(original);
    await historyCount(original, 1);
    await expect(
      original
        .getByTestId("pomodoro-history")
        .locator(`[data-session-id="${session.id}"]`),
    ).toBeVisible();
    await authTab.unroute(`${appURL}/app`);
    await authTab.goto(`${appURL}/app`);
    await synced(authTab);
    await openTimer(authTab);
    await historyCount(authTab, 1);
    await original.reload();
    await synced(original);
    await openTimer(original);
    await historyCount(original, 1);
  } finally {
    await context.close();
  }
});
