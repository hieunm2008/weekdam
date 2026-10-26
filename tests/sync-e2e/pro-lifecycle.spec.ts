import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const appURL = "http://127.0.0.1:4280";
const tools = (page: Page) =>
  page.getByRole("navigation", { name: "Công cụ Pro", exact: true });
async function seed(context: BrowserContext, reminders = false) {
  const page = await context.newPage();
  // Install Date before BillingSession captures its clock function. Installing
  // it only after the app mounts would leave the session using native Date.now.
  await page.clock.setFixedTime(new Date());
  await page.goto(
    `${appURL}/tests/fixtures/auth.html?uid=lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await page.waitForURL(`${appURL}/app`);
  await page.goto(`${appURL}/tests/fixtures/pro.html`);
  await expect(page.locator("#status")).toHaveText("Ready");
  const prepared = await page.evaluate(
    (options) => (window as any).proFixture.seedLifecycle(options),
    {
      reminders,
      lifetimeMs: reminders ? 3_600_000 : 30_000,
    },
  );
  await page.goto(`${appURL}/app#pro`);
  await expect(page.locator(".pro-tag").first()).toHaveText("Pro còn hạn");
  return { page, prepared };
}

test("expiry blocks new Pro runs while existing work and templates remain editable, completable, deletable and backed up", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    serviceWorkers: "block",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  try {
    const { page, prepared } = await seed(context);
    await page.clock.setFixedTime(new Date(prepared.expiresAt + 1));
    await expect(page.locator(".pro-tag").first()).toHaveText("Pro đã hết hạn");
    await tools(page)
      .getByRole("button", { name: "Ôn thi tự động", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tính kế hoạch", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Quản lý gói", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gia hạn mô phỏng", exact: true }),
    ).toBeEnabled();

    await tools(page)
      .getByRole("button", { name: "Mẫu kế hoạch", exact: true })
      .click();
    const saved = page
      .locator(".pro-row")
      .filter({ has: page.getByText("Lifecycle template", { exact: true }) });
    await saved.getByRole("button", { name: "Đổi tên", exact: true }).click();
    const editing = page.locator(".pro-row").filter({
      has: page.getByRole("button", { name: "Lưu tên", exact: true }),
    });
    await editing
      .getByLabel("Tên mẫu", { exact: true })
      .fill("Renamed after expiry");
    await editing.getByRole("button", { name: "Lưu tên", exact: true }).click();
    await expect(
      page.getByText("Renamed after expiry", { exact: true }),
    ).toBeVisible();
    const renamed = page
      .locator(".pro-row")
      .filter({ has: page.getByText("Renamed after expiry", { exact: true }) });
    await renamed.getByRole("button", { name: "Xóa", exact: true }).click();
    await renamed
      .getByRole("button", { name: "Xác nhận xóa", exact: true })
      .click();
    await expect(
      page.getByText("Renamed after expiry", { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Kế hoạch", exact: true }).click();
    const card = page.locator('[data-step-id="lifecycle-step"]');
    await card.locator(".task-title").click();
    await page
      .getByLabel("Tên công việc", { exact: true })
      .fill("Edited after expiry");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await card.getByRole("checkbox").check();
    await expect(card.getByRole("checkbox")).toBeChecked();
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error("Backup download missing");
    const backup = JSON.parse(await readFile(path, "utf8"));
    const tasks = backup.weeks.flatMap((week: any) =>
      week.projects.flatMap((project: any) => project.tasks),
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("Edited after expiry");
    expect(tasks[0].subtasks[0].done).toBe(true);
    expect(backup.pro.appliedOperations).toEqual(["lifecycle-seed"]);
    expect(backup).not.toHaveProperty("demoBilling");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await card.locator(".task-title").click();
    await page
      .getByRole("button", { name: "Xóa công việc", exact: true })
      .click();
    await expect(card).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("two tabs claim one live deadline notification and a reload does not deliver it again", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    serviceWorkers: "block",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  try {
    await context.grantPermissions(["notifications"], { origin: appURL });
    await context.addInitScript(() => {
      const NativeNotification = window.Notification;
      (window as any).deadlineNotificationAttempts = [];
      window.Notification = class extends NativeNotification {
        constructor(title: string, options?: NotificationOptions) {
          (window as any).deadlineNotificationAttempts.push({
            title,
            tag: options?.tag,
          });
          super(title, options);
          this.close();
        }
      };
    });
    const { page: first, prepared } = await seed(context, true);
    const second = await context.newPage();
    await second.clock.setFixedTime(new Date(prepared.baseNow));
    await second.goto(`${appURL}/app#pro`);
    await expect(second.locator(".pro-tag").first()).toHaveText("Pro còn hạn");
    // Entitlement can be cached before the plan listener finishes hydration.
    // Move time only after both tabs have the enabled reminder configuration;
    // otherwise the data-change scan correctly classifies the milestone missed.
    for (const page of [first, second]) {
      await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ");
      await tools(page)
        .getByRole("button", { name: "Nhắc deadline", exact: true })
        .click();
      await expect(
        page.getByRole("checkbox", {
          name: "Bật nhắc trong ứng dụng",
          exact: true,
        }),
      ).toBeChecked();
      await expect(
        page.getByRole("button", {
          name: "Tắt thông báo trình duyệt",
          exact: true,
        }),
      ).toBeVisible();
      expect(await page.evaluate(() => Notification.permission)).toBe(
        "granted",
      );
      await expect(
        page.getByRole("complementary", {
          name: "Hộp nhắc deadline",
          exact: true,
        }),
      ).toHaveCount(0);
    }
    for (const page of [first, second])
      await page.clock.setFixedTime(new Date(prepared.dueAt + 1000));
    const attempts = async () =>
      (
        await Promise.all(
          [first, second].map((page) =>
            page.evaluate(
              () => (window as any).deadlineNotificationAttempts.length,
            ),
          ),
        )
      ).reduce((a, b) => a + b, 0);
    await expect
      .poll(attempts, { timeout: 40_000, intervals: [500, 1000] })
      .toBe(1);
    for (const page of [first, second]) {
      const inbox = page.getByRole("complementary", {
        name: "Hộp nhắc deadline",
        exact: true,
      });
      await expect(inbox).toContainText("1 nhắc deadline");
    }
    const firstAttempts = await first.evaluate(
      () => (window as any).deadlineNotificationAttempts.length,
    );
    await second.reload();
    await expect(
      second.getByRole("complementary", {
        name: "Hộp nhắc deadline",
        exact: true,
      }),
    ).toContainText("1 nhắc deadline");
    expect(
      await second.evaluate(
        () => (window as any).deadlineNotificationAttempts.length,
      ),
    ).toBe(0);
    expect(
      await first.evaluate(
        () => (window as any).deadlineNotificationAttempts.length,
      ),
    ).toBe(firstAttempts);
  } finally {
    await context.close();
  }
});
