import { expect, test, type Page } from "@playwright/test";
import type { Plan } from "../../src/domain";
const appURL = "http://127.0.0.1:4280";
const tools = (page: Page) =>
  page.getByRole("navigation", { name: "Công cụ Pro", exact: true });
async function synced(page: Page) {
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 20_000,
  });
}
async function checkout(
  page: Page,
  outcome: "thành công" | "thất bại" | "hủy",
) {
  await tools(page)
    .getByRole("button", { name: "Quản lý gói", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^(Nâng cấp|Gia hạn) mô phỏng$/ })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Thanh toán mô phỏng — không thu tiền",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await modal
    .getByRole("button", { name: `Mô phỏng ${outcome}`, exact: true })
    .click();
  await expect(modal).toHaveCount(0);
}
async function billingCache(page: Page, uid?: string) {
  return page.evaluate((expectedUid) => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith("weekdam:demo-billing:demo-weekdam-pro:"),
    );
    const key = expectedUid
      ? keys.find(
          (key) =>
            key === `weekdam:demo-billing:demo-weekdam-pro:${expectedUid}`,
        )
      : keys[0];
    return key ? JSON.parse(localStorage.getItem(key)!) : null;
  }, uid);
}

async function savedPlan(page: Page, uid: string): Promise<Plan | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<Plan | undefined>((resolve, reject) => {
        const request = indexedDB.open("weekdam-local", 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction("plans").objectStore("plans").get(key);
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
    `account:demo-weekdam-pro:${uid}`,
  );
}

function examSummary(plan: Plan | undefined) {
  if (!plan) return null;
  const projects = plan.weeks.flatMap((week) => week.projects);
  const tasks = projects.flatMap((project) =>
    project.tasks.filter((task) => task.source?.kind === "exam"),
  );
  const minute = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return {
    projects: projects.filter((project) =>
      project.tasks.some((task) => task.source?.kind === "exam"),
    ).length,
    tasks: tasks.length,
    minutes: tasks
      .flatMap((task) => task.subtasks)
      .reduce(
        (total, step) =>
          total + minute(step.endTime!) - minute(step.startTime!),
        0,
      ),
    operations: plan.pro?.appliedOperations ?? [],
  };
}

test("continues a guest exam form after Emulator Google login, upgrades, and uses all five Pro tools", async ({
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  const context = await browser.newContext({
    serviceWorkers: "block",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const mobileContext = await browser.newContext({
    serviceWorkers: "block",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    // The Auth Emulator's popup uses optional CDN styles and a Material wrapper.
    // Abort those requests so its own inline sign-in logic runs without internet.
    await context.route(
      /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
      (route) => route.abort(),
    );
    const page = await context.newPage();
    await page.goto(`${appURL}/app#pro`);
    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google", exact: true }),
    ).toBeEnabled();
    await page.clock.setFixedTime(new Date("2026-10-23T08:00:00+07:00"));
    // Form is entered before authentication. The pending action must preserve it.
    await tools(page)
      .getByRole("button", { name: "Ôn thi tự động", exact: true })
      .click();
    await page.getByLabel("Môn học / kỳ thi", { exact: true }).fill("UI Exam");
    await page.getByLabel("Ngày bắt đầu", { exact: true }).fill("2026-10-23");
    await page.getByLabel("Ngày thi", { exact: true }).fill("2026-10-30");
    await page.getByLabel("Nội dung 1", { exact: true }).fill("Tích phân UI");
    await page.getByLabel("Phút 1", { exact: true }).fill("50");
    await page.getByLabel("Phút 2", { exact: true }).fill("50");
    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Tính kế hoạch", exact: true })
      .click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/127\.0\.0\.1:9099/);
    await popup
      .getByRole("button", { name: "Add new account", exact: true })
      .click();
    await popup
      .locator("#email-input")
      .fill(`pro-ui-${Date.now()}@example.test`);
    await popup.locator("#display-name-input").fill("Pro UI Demo");
    await popup
      .getByRole("button", { name: "Sign in with Google.com", exact: true })
      .click();
    await expect(page.locator(".pro-tag").first()).toHaveText("Free", {
      timeout: 20_000,
    });
    await page
      .getByRole("button", { name: "Dùng thử Pro 7 ngày", exact: true })
      .click();
    await expect(
      page.getByLabel("Môn học / kỳ thi", { exact: true }),
    ).toHaveValue("UI Exam");
    await expect(page.getByLabel("Nội dung 1", { exact: true })).toHaveValue(
      "Tích phân UI",
    );
    await expect(
      page.getByRole("button", {
        name: "Áp dụng toàn bộ kế hoạch",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator(".pro-preview").filter({
        has: page.getByRole("heading", { name: "Xem trước", exact: true }),
      }),
    ).toContainText("100/100");
    await page
      .getByRole("button", { name: "Áp dụng toàn bộ kế hoạch", exact: true })
      .click();
    await synced(page);
    const trial = await billingCache(page);
    expect(trial.trialUsed).toBe(true);
    await expect
      .poll(async () => examSummary(await savedPlan(page, trial.uid)))
      .toMatchObject({ projects: 1, tasks: 2, minutes: 100 });
    const applied = examSummary(await savedPlan(page, trial.uid))!;
    expect(applied.operations).toHaveLength(1);

    // One real UI Undo removes the whole generated plan and its idempotency
    // ledger together, while the separately stored trial remains unchanged.
    await page
      .locator(".toast")
      .getByRole("button", { name: "Hoàn tác", exact: true })
      .click();
    await synced(page);
    await expect
      .poll(async () => examSummary(await savedPlan(page, trial.uid)))
      .toEqual({ projects: 0, tasks: 0, minutes: 0, operations: [] });
    expect(await billingCache(page)).toEqual(trial);

    await page
      .getByRole("button", { name: "Tính kế hoạch", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Áp dụng toàn bộ kế hoạch", exact: true })
      .click();
    await synced(page);
    await expect
      .poll(async () => examSummary(await savedPlan(page, trial.uid)))
      .toEqual(applied);
    await tools(page)
      .getByRole("button", { name: "Quản lý gói", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Dùng thử Pro 7 ngày", exact: true }),
    ).toBeDisabled();
    await checkout(page, "thất bại");
    expect((await billingCache(page)).expiresAt).toBe(trial.expiresAt);
    await expect(
      page.getByRole("cell", { name: "Thất bại", exact: true }),
    ).toBeVisible();
    await checkout(page, "hủy");
    expect((await billingCache(page)).expiresAt).toBe(trial.expiresAt);
    await expect(
      page.getByRole("cell", { name: "Đã hủy", exact: true }),
    ).toBeVisible();
    await checkout(page, "thành công");
    await expect(page.locator(".pro-tag").first()).toHaveText("Pro còn hạn");
    const paid = await billingCache(page);
    expect(paid.expiresAt).toBeGreaterThan(trial.expiresAt);

    await tools(page)
      .getByRole("button", { name: "Lịch học lặp lại", exact: true })
      .click();
    await page
      .getByLabel("Tên lịch lặp", { exact: true })
      .fill("UI Recurrence");
    await page
      .getByLabel("Bắt đầu từ ngày", { exact: true })
      .fill("2026-10-23");
    await page.getByLabel("Kết thúc ngày", { exact: true }).fill("2026-10-30");
    await page.getByLabel("Giờ bắt đầu", { exact: true }).fill("17:00");
    await page.getByLabel("Giờ kết thúc", { exact: true }).fill("17:50");
    await page
      .getByRole("button", { name: "Xem trước lịch lặp", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "4 buổi · 0 khung giờ trùng",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tạo toàn bộ các buổi", exact: true })
      .click();
    await synced(page);
    // A wrapping select label also contains the option text in its DOM label.
    const occurrences = page.getByRole("combobox", { name: /^Chọn buổi/ });
    await expect(occurrences).toBeVisible();
    await expect(occurrences.locator("option")).toHaveCount(5);

    await tools(page)
      .getByRole("button", { name: "Mẫu kế hoạch", exact: true })
      .click();
    await page
      .getByLabel("Tên mẫu", { exact: true })
      .fill("UI Personal Template");
    await page.getByRole("checkbox", { name: "UI Exam", exact: true }).check();
    await page
      .getByRole("button", { name: "Lưu mẫu riêng", exact: true })
      .click();
    const saved = page
      .locator(".pro-row")
      .filter({ has: page.getByText("UI Personal Template", { exact: true }) });
    await expect(saved).toBeVisible();
    await saved.getByRole("button", { name: "Xem trước", exact: true }).click();
    await page
      .getByRole("checkbox", {
        name: "Tôi đồng ý giữ các buổi trùng giờ",
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Thêm vào tuần này", exact: true })
      .click();
    await synced(page);

    await tools(page)
      .getByRole("button", { name: "Báo cáo học tập", exact: true })
      .click();
    await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-23");
    await page.getByLabel("Đến ngày", { exact: true }).fill("2026-10-30");
    await page
      .getByRole("button", { name: "Tạo báo cáo", exact: true })
      .click();
    await expect(page.locator(".pro-metrics strong").first()).toHaveText("400");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      "weekdam-2026-10-23-2026-10-30.csv",
    );
    await download.saveAs(testInfo.outputPath("pro-ui-report.csv"));

    await tools(page)
      .getByRole("button", { name: "Nhắc deadline", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Bật nhắc trong ứng dụng", exact: true })
      .check();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Browser.setPermission", {
      permission: { name: "notifications" },
      setting: "denied",
      origin: appURL,
    });
    await page
      .getByRole("button", { name: "Bật thông báo trình duyệt", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Nhắc trong app vẫn hoạt động" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: "Bật nhắc trong ứng dụng",
        exact: true,
      }),
    ).toBeChecked();
    await synced(page);
    await page.screenshot({
      path: testInfo.outputPath("pro-ui-desktop.png"),
      fullPage: true,
    });
    await page.reload();
    await expect(page.locator(".pro-tag").first()).toHaveText("Pro còn hạn");

    const phone = await mobileContext.newPage();
    await phone.goto(`${appURL}/tests/fixtures/auth.html?uid=${paid.uid}`);
    await phone.waitForURL(`${appURL}/app`);
    await phone.goto(`${appURL}/app#pro`);
    await synced(phone);
    await expect(phone.locator(".pro-tag").first()).toHaveText("Pro còn hạn");
    expect((await billingCache(phone)).expiresAt).toBe(paid.expiresAt);
    await tools(phone)
      .getByRole("button", { name: "Mẫu kế hoạch", exact: true })
      .click();
    await expect(
      phone.getByText("UI Personal Template", { exact: true }),
    ).toBeVisible();
    await tools(phone)
      .getByRole("button", { name: "Nhắc deadline", exact: true })
      .click();
    await expect(
      phone.getByRole("checkbox", {
        name: "Bật nhắc trong ứng dụng",
        exact: true,
      }),
    ).toBeChecked();
    expect(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await phone.screenshot({
      path: testInfo.outputPath("pro-ui-mobile.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
    await mobileContext.close();
  }
});

test("clears an old account's pending tool and open checkout when the account changes", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    serviceWorkers: "block",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const firstUid = `pending-owner-a-${Date.now()}`;
  const secondUid = `pending-owner-b-${Date.now()}`;
  try {
    const page = await context.newPage();
    await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${firstUid}`);
    await page.waitForURL(`${appURL}/app`);
    await page.goto(`${appURL}/app#pro`);
    await expect(page.locator(".pro-tag").first()).toHaveText("Free");
    await tools(page)
      .getByRole("button", { name: "Ôn thi tự động", exact: true })
      .click();
    await page
      .getByLabel("Môn học / kỳ thi", { exact: true })
      .fill("Old account pending exam");
    await page
      .getByRole("button", { name: "Tính kế hoạch", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Quản lý gói", exact: true }),
    ).toBeVisible();
    const auth = await context.newPage();
    await auth.route(`${appURL}/app`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<title>Auth complete</title>",
      }),
    );
    await auth.goto(`${appURL}/tests/fixtures/auth.html?uid=${secondUid}`);
    await auth.waitForURL(`${appURL}/app`);
    await synced(page);
    await expect
      .poll(async () => (await billingCache(page, secondUid))?.uid)
      .toBe(secondUid);
    await page
      .getByRole("button", { name: "Dùng thử Pro 7 ngày", exact: true })
      .click();
    await expect(page.locator(".pro-tag").first()).toHaveText(
      "Dùng thử 7 ngày",
    );
    await expect(
      page.getByRole("heading", { name: "Quản lý gói", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Môn học / kỳ thi", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Gia hạn mô phỏng", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", {
        name: "Thanh toán mô phỏng — không thu tiền",
        exact: true,
      }),
    ).toBeVisible();
    await auth.goto(`${appURL}/tests/fixtures/auth.html?uid=${firstUid}`);
    await auth.waitForURL(`${appURL}/app`);
    await synced(page);
    await expect
      .poll(async () => (await billingCache(page, firstUid))?.uid)
      .toBe(firstUid);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".pro-tag").first()).toHaveText("Free");
    await expect(
      page.getByRole("button", { name: "Dùng thử Pro 7 ngày", exact: true }),
    ).toBeEnabled();
  } finally {
    await context.close();
  }
});
