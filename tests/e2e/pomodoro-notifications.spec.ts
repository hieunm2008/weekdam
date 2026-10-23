import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openTimer(page: Page) {
  await page.goto("/app#pomodoro");
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("25:00");
}

async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 1000));
}

test("opens the deep link and a notification message from the planner without enabling permission", async ({
  page,
}) => {
  await openTimer(page);
  await expect(
    page.getByRole("checkbox", { name: "Thông báo trình duyệt", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Kế hoạch", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toHaveCount(0);
  await page.evaluate(() => {
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", { data: { type: "OPEN_POMODORO" } }),
    );
  });
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("25:00");
});

test("requests notification permission only when enabled and falls back to the in-app completion notice", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-11T05:00:00Z") });
  await page.addInitScript(() => {
    const state = { requests: 0 };
    Object.assign(window, { pomodoroPermissionState: state });
    Object.defineProperty(Notification, "permission", { get: () => "default" });
    Notification.requestPermission = async () => {
      state.requests++;
      return "denied";
    };
  });
  await openTimer(page);
  const requestCount = () =>
    page.evaluate(
      () =>
        (window as unknown as { pomodoroPermissionState: { requests: number } })
          .pomodoroPermissionState.requests,
    );
  expect(await requestCount()).toBe(0);
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
  expect(await requestCount()).toBe(0);
  const notifications = page.getByRole("checkbox", {
    name: "Thông báo trình duyệt",
    exact: true,
  });
  await notifications.click();
  await expect.poll(requestCount).toBe(1);
  await expect(notifications).not.toBeChecked();
  await expect(page.getByTestId("pomodoro-page")).toContainText("quyền");
  await pauseClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(60_100);
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".pomodoro-message")).toContainText("hoàn thành");
  expect(await requestCount()).toBe(1);
});

test("delivers an enabled notification through the real service worker with the Pomodoro deep link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["notifications"]);
  await page.clock.install({ time: new Date("2026-10-11T05:00:00Z") });
  await openTimer(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const notifications = page.getByRole("checkbox", {
    name: "Thông báo trình duyệt",
    exact: true,
  });
  await expect(notifications).not.toBeChecked();
  await notifications.click();
  await expect(notifications).toBeChecked();
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
  await pauseClock(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(60_100);
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return (await registration.getNotifications()).map((notification) => ({
          title: notification.title,
          tag: notification.tag,
          url: notification.data?.url,
        }));
      }),
    )
    .toEqual([
      {
        title: "Pomodoro · weekdam",
        tag: expect.stringMatching(/^pomodoro-guest-/),
        url: "/app#pomodoro",
      },
    ]);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    for (const notification of await registration.getNotifications())
      notification.close();
  });
});

test("keeps planner shortcuts out of Pomodoro and supports English dark layout with reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("weekdam:language", "en");
    localStorage.setItem("weekdam:theme", "dark");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTimer(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "Focus rhythm", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).focus();
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("25:00");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", { name: "Start", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
