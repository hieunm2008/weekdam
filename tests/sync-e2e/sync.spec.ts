import { test, expect, type BrowserContext } from "@playwright/test";
async function account(context: BrowserContext, uid: string) {
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4280/tests/fixtures/auth.html?uid=" + uid);
  await page.waitForURL("http://127.0.0.1:4280/app");
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 15000,
  });
  return page;
}
test("syncs two devices, persists offline edits across reload, and isolates sign-out", async ({
  browser,
}) => {
  const uid = "owner-" + Date.now(),
    a = await browser.newContext(),
    b = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
  const desktop = await account(a, uid),
    phone = await account(b, uid);
  await desktop
    .getByRole("main")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await desktop.getByLabel("Tên dự án", { exact: true }).fill("Synced study");
  await desktop.getByRole("button", { name: "Lưu", exact: true }).click();
  await desktop
    .getByRole("button", { name: "Thêm công việc", exact: true })
    .first()
    .click();
  await desktop
    .getByLabel("Tên công việc", { exact: true })
    .fill("Cross-device reading");
  await desktop.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(
    phone.getByTestId("day-work").getByText("Cross-device reading"),
  ).toBeVisible();
  // Data sync can finish before the fresh PWA installation finishes precaching.
  // Offline navigation requires an active service worker, not only a synced plan.
  await phone.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await b.setOffline(true);
  await phone
    .getByTestId("day-work")
    .getByRole("checkbox", { name: "Cross-device reading" })
    .check();
  await expect(phone.getByTestId("week-progress")).toContainText("100%");
  await phone.reload();
  await expect(phone.getByTestId("week-progress")).toContainText("100%");
  await b.setOffline(false);
  await expect(desktop.getByTestId("week-progress")).toContainText("100%");
  await expect(phone.getByTestId("sync-status")).toContainText("Đã đồng bộ");
  await phone.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await phone.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    phone
      .getByRole("main")
      .getByRole("button", { name: "Tạo dự án", exact: true }),
  ).toBeVisible();
  await expect(phone.getByText("Synced study", { exact: true })).toHaveCount(0);
  await a.close();
  await b.close();
});
test("imports the saved Guest workspace after the authentication redirect reload", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto("http://127.0.0.1:4280/app");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByLabel("Tên dự án", { exact: true }).fill("Saved Guest work");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.goto(
    "http://127.0.0.1:4280/tests/fixtures/auth.html?uid=guest-migration-" +
      Date.now(),
  );
  await page.waitForURL("http://127.0.0.1:4280/app");
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ");
  await expect(
    page.getByRole("combobox", { name: "Lọc dự án", exact: true }),
  ).toContainText("Saved Guest work");
  await context.close();
});
test("shares one account across tabs without losing independent task edits", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    uid = "tabs-" + Date.now(),
    a = await account(context, uid),
    b = await context.newPage();
  await b.goto("http://127.0.0.1:4280/app");
  await expect(b.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 15000,
  });
  await a
    .getByRole("main")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await a.getByLabel("Tên dự án", { exact: true }).fill("Shared tabs");
  await a.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(
    b.getByRole("combobox", { name: "Lọc dự án", exact: true }),
  ).toContainText("Shared tabs");
  await Promise.all([
    a
      .getByRole("button", { name: "Thêm công việc", exact: true })
      .first()
      .click(),
    b
      .getByRole("button", { name: "Thêm công việc", exact: true })
      .first()
      .click(),
  ]);
  await a.getByLabel("Tên công việc", { exact: true }).fill("From tab A");
  await b.getByLabel("Tên công việc", { exact: true }).fill("From tab B");
  await Promise.all([
    a.getByRole("button", { name: "Lưu", exact: true }).click(),
    b.getByRole("button", { name: "Lưu", exact: true }).click(),
  ]);
  for (const page of [a, b]) {
    await expect(
      page.getByTestId("day-work").getByText("From tab A"),
    ).toBeVisible();
    await expect(
      page.getByTestId("day-work").getByText("From tab B"),
    ).toBeVisible();
  }
  await context.close();
});
