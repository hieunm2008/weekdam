const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const url = "https://weekdam-hieu-2026.web.app";
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const report = { url, checkedAt: new Date().toISOString(), checks: [] };
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(url);
    expect(response.status()).toBe(200);
    await page
      .getByRole("main")
      .getByRole("button", { name: "Tạo dự án", exact: true })
      .click();
    await page
      .getByLabel("Tên dự án", { exact: true })
      .fill("Production smoke (Guest)");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page
      .getByRole("button", { name: "Thêm công việc", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Tên công việc", { exact: true })
      .fill("Verify deployed planner");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    const task = page
      .getByTestId("day-work")
      .getByRole("checkbox", { name: "Verify deployed planner" })
      .first();
    await task.check();
    await expect(page.getByTestId("week-progress")).toContainText("100%");
    await page.reload();
    await expect(task).toBeChecked();
    report.checks.push("Desktop Guest CRUD, completion and persistence");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(task).toBeChecked();
    await task.uncheck();
    await page.reload();
    await expect(task).not.toBeChecked();
    await context.setOffline(false);
    await page.reload();
    await expect(task).not.toBeChecked();
    report.checks.push(
      "HTTPS PWA offline reload, local edit, restart and reconnect",
    );
    await page.screenshot({
      path: "docs/validation/screens/production-desktop.png",
      fullPage: true,
    });
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await mobile.newPage();
    await phone.goto(url);
    await expect(
      phone.getByRole("button", { name: "Cài đặt", exact: true }),
    ).toBeVisible();
    expect(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await phone.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await expect(phone.getByRole("button", { name: /Google/ })).toBeEnabled();
    await phone.getByRole("button", { name: "Đóng", exact: true }).click();
    await phone.screenshot({
      path: "docs/validation/screens/production-mobile.png",
      fullPage: true,
    });
    report.checks.push("Mobile layout and configured Google login control");
    const manifest = await (await fetch(url + "/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
    report.checks.push("Production manifest");
    const handler = await (await fetch(url + "/__/auth/handler")).text();
    expect(handler).not.toContain("<title>weekdam</title>");
    expect(handler).toMatch(/firebase|auth/i);
    report.checks.push("Reserved Firebase auth handler served outside SPA");
    const denied = await fetch(
      "https://firestore.googleapis.com/v1/projects/weekdam-hieu-2026/databases/(default)/documents/users/smoke/records",
    );
    expect(denied.status).toBe(403);
    report.checks.push("Production Firestore rejects unauthenticated read");
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    const popupEvent = page.waitForEvent("popup", { timeout: 30000 });
    await page
      .getByRole("button", { name: "Đăng nhập Google", exact: true })
      .click();
    const popup = await popupEvent;
    await popup.waitForURL((u) => u.hostname === "accounts.google.com", {
      timeout: 30000,
    });
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.getByRole("heading").first()).toBeVisible();
    await fs.writeFile(
      "docs/validation/production-google-popup.json",
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          projectId: "weekdam-hieu-2026",
          popupOrigin: new URL(popup.url()).origin,
          title: await popup.title(),
          visibleHeadings: await popup.getByRole("heading").allTextContents(),
          googleSignInCompleted: false,
        },
        null,
        2,
      ) + "\n",
    );
    await popup.screenshot({
      path: "docs/validation/screens/production-google-popup.png",
    });
    report.checks.push(
      "Google OAuth popup reaches Google Accounts; no credentials entered",
    );
    await popup.close();
    await expect(
      page.getByRole("dialog", { name: "Cài đặt" }).getByRole("status"),
    ).toHaveText("Đã hủy đăng nhập Google.", { timeout: 10000 });
    await expect(
      page.getByText("Đồng bộ chưa thành công", { exact: true }),
    ).toHaveCount(0);
    report.checks.push(
      "Closing Google popup reports login cancellation without a sync error",
    );
    expect(errors).toEqual([]);
    report.checks.push("No desktop page errors");
    report.status = "passed";
  } finally {
    await browser.close();
    await fs.writeFile(
      "docs/validation/production-smoke.json",
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
