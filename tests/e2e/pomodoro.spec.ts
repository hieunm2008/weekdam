import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function installClock(page: Page, date = "2026-10-11T05:00:00Z") {
  const time = new Date(date);
  await page.clock.install({ time });
}
async function freezeClock(page: Page) {
  const currentTime = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(currentTime + 1000));
}

async function openPomodoro(page: Page) {
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Pomodoro", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
}

async function shortenFocus(page: Page) {
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
}

async function sessions(page: Page, scope = "guest") {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<
        Array<{
          id: string;
          focusedDurationMs: number;
          outcome: string;
          task?: { id: string };
        }>
      >((resolve, reject) => {
        const request = db.transaction("plans").objectStore("plans").get(key);
        request.onsuccess = () =>
          resolve(request.result?.pomodoroSessions ?? []);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, scope);
}

test("finishes once, waits for a manual break and retains history after reload", async ({
  page,
}) => {
  await installClock(page);
  await openPomodoro(page);
  await shortenFocus(page);
  await freezeClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(60_100);
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => sessions(page))
    .toMatchObject([{ outcome: "completed", focusedDurationMs: 60_000 }]);
  await page.clock.fastForward(600_000);
  expect(await sessions(page)).toHaveLength(1);
  await page.clock.resume();
  await page.reload();
  await page
    .getByRole("button", { name: "Pomodoro", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
});

test("shares the active timer between tabs and records paused early stops without pause time", async ({
  page,
  context,
}) => {
  await installClock(page);
  await openPomodoro(page);
  await shortenFocus(page);
  await freezeClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(10_000);
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("00:50");
  await page.clock.resume();
  const second = await context.newPage();
  await openPomodoro(second);
  await freezeClock(second);
  await expect(second.getByRole("timer")).toHaveText("00:50");
  await page.clock.runFor(120_000);
  await second.getByRole("button", { name: "Dừng phiên", exact: true }).click();
  await expect
    .poll(() => sessions(page))
    .toMatchObject([{ outcome: "stopped", focusedDurationMs: 10_000 }]);
  await expect(
    page.getByRole("button", { name: "Bắt đầu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
});

test("restores a running deadline offline and exposes controls in the planner minibar", async ({
  page,
  context,
}) => {
  await installClock(page);
  await openPomodoro(page);
  await shortenFocus(page);
  await freezeClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(15_000);
  await page.clock.resume();
  await page.reload();
  const bar = page.getByTestId("pomodoro-minibar");
  await expect(bar).toBeVisible();
  await freezeClock(page);
  await expect(bar.getByRole("timer")).toHaveText(/^00:4[0-5]$/);
  await context.setOffline(true);
  await bar.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(
    bar.getByRole("button", { name: "Tiếp tục", exact: true }),
  ).toBeVisible();
  await bar.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.clock.runFor(45_100);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Đã hoàn thành phiên tập trung" }),
  ).toBeVisible();
  await expect
    .poll(() => sessions(page))
    .toMatchObject([{ outcome: "completed", focusedDurationMs: 60_000 }]);
  await context.setOffline(false);
});

test("opens a task from board and calendar without completing it", async ({
  page,
}) => {
  await installClock(page);
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Cài đặt", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(
    JSON.stringify({
      version: 1,
      weeks: [
        {
          id: "week_2026-10-05",
          start: "2026-10-05",
          ended: false,
          projects: [
            {
              id: "p-study",
              name: "Study",
              tasks: [
                {
                  id: "task-read",
                  name: "Read",
                  note: "",
                  done: false,
                  subtasks: [
                    {
                      id: "step-read",
                      day: 6,
                      weight: 1,
                      note: "",
                      done: false,
                      missed: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  );
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
  await page
    .getByRole("button", { name: "Pomodoro · Read", exact: true })
    .click();
  await expect(
    page.getByLabel("Công việc Pomodoro", { exact: true }),
  ).toHaveValue("task-read");
  await shortenFocus(page);
  await freezeClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(60_100);
  expect((await sessions(page))[0].task?.id).toBe("task-read");
  await page
    .getByRole("button", { name: "Kế hoạch", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Read", exact: true }),
  ).not.toBeChecked();
  await page.clock.resume();
  await page
    .getByRole("button", { name: "Lịch theo giờ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pomodoro · Read", exact: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
});

test("supports compact mobile layout, denied notifications and accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("weekdam:theme", "dark");
    Object.defineProperty(Notification, "permission", { get: () => "denied" });
  });
  await openPomodoro(page);
  await page
    .getByRole("checkbox", { name: "Thông báo trình duyệt", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Thông báo trình duyệt", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByTestId("pomodoro-page")).toContainText("quyền");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
