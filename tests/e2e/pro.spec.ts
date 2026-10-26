import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = { requests: 0 };
    Object.assign(window, { proPermissionState: state });
    Notification.requestPermission = async () => {
      state.requests++;
      return "denied";
    };
  });
});

async function expectNoPermissionRequest(page: Page) {
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { proPermissionState: { requests: number } })
          .proPermissionState.requests,
    ),
  ).toBe(0);
}

async function capture(page: Page, testInfo: TestInfo, filename: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const png = await page.screenshot({
    path: testInfo.outputPath(filename),
    fullPage: true,
  });
  expect(png.readUInt32BE(16)).toBe(page.viewportSize()!.width);
}
async function primaryContrast(page: Page, name: string) {
  return page.getByRole("link", { name, exact: true }).evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const channels = (color.match(/[\d.]+/g) ?? [])
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const a = luminance(style.color),
      b = luminance(style.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test("pricing keeps annual selection and guest sees five tools without modifying the plan", async ({
  page,
}, testInfo) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pro");
  await capture(page, testInfo, "pricing-vi-light.png");
  expect(await primaryContrast(page, "Khám phá Pro")).toBeGreaterThanOrEqual(
    4.5,
  );
  await page.getByRole("button", { name: "Theo năm", exact: true }).click();
  await page.getByRole("link", { name: "Khám phá Pro", exact: true }).click();
  await expect(page).toHaveURL(/\/app\?plan=year#pro$/);
  await expect(
    page.getByRole("heading", { name: "weekdam Pro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("249.000đ", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ôn thi tự động", exact: true })
    .click();
  await expect(
    page.getByText("50 phút · Lập lịch theo giờ rảnh"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tính kế hoạch", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Môn học / kỳ thi", { exact: true })
    .fill("Thi Toán cuối kỳ riêng");
  await page
    .getByLabel("Nội dung 1", { exact: true })
    .fill("Chương 1 tùy chỉnh");
  await page
    .getByRole("button", { name: "Tính kế hoạch", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Quản lý gói", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ôn thi tự động", exact: true })
    .click();
  await expect(
    page.getByLabel("Môn học / kỳ thi", { exact: true }),
  ).toHaveValue("Thi Toán cuối kỳ riêng");
  await expect(page.getByLabel("Nội dung 1", { exact: true })).toHaveValue(
    "Chương 1 tùy chỉnh",
  );
  await capture(page, testInfo, "exam-vi-light.png");
  await page
    .getByRole("button", { name: "Lịch học lặp lại", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lịch học lặp lại", exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, "recurrence-vi-light.png");
  await page.getByRole("button", { name: "Mẫu kế hoạch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thư viện mẫu kế hoạch", exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, "templates-vi-light.png");
  await page
    .getByRole("button", { name: "Báo cáo học tập", exact: true })
    .click();
  await expect(page.getByText("Dữ liệu mẫu", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, testInfo, "reports-vi-light.png");
  await page
    .getByRole("button", { name: "Nhắc deadline", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nhắc deadline nâng cao", exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, "reminders-vi-light.png");
  await expectNoPermissionRequest(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "weekdam Pro", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open("weekdam-local");
        req.onsuccess = () => {
          const db = req.result;
          const r = db.transaction("plans").objectStore("plans").get("guest");
          r.onsuccess = () => {
            resolve(r.result?.weeks.length ?? 0);
            db.close();
          };
        };
      });
    }),
  ).toBe(0);
});

test("Pro pages support English dark mode and mobile width", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("weekdam:language", "en");
    localStorage.setItem("weekdam:theme", "dark");
  });
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await capture(page, testInfo, "pricing-en-dark.png");
  expect(await primaryContrast(page, "Explore Pro")).toBeGreaterThanOrEqual(
    4.5,
  );
  await page.goto("/app#pro");
  await page
    .getByRole("button", { name: "Automatic exam planning", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Calculate plan", exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, "exam-en-dark.png");
  await page
    .getByRole("button", { name: "Recurring classes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Recurring tasks & classes",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, testInfo, "recurrence-en-dark.png");
  await page
    .getByRole("button", { name: "Plan templates", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Plan template library", exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, "templates-en-dark.png");
  await page
    .getByRole("button", { name: "Study reports", exact: true })
    .click();
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, testInfo, "reports-en-dark.png");
  await page
    .getByRole("button", { name: "Deadline reminders", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Advanced deadline reminders",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Enable browser notifications",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, testInfo, "reminders-en-dark.png");
  await expectNoPermissionRequest(page);
});

for (const [language, theme] of [
  ["vi", "dark"],
  ["en", "light"],
] as const) {
  test(`five Pro tools fit ${language} ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      ({ language, theme }) => {
        localStorage.setItem("weekdam:language", language);
        localStorage.setItem("weekdam:theme", theme);
      },
      { language, theme },
    );
    await page.goto("/pricing");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await capture(page, testInfo, `pricing-${language}-${theme}.png`);
    await page.goto("/app#pro");
    const tools =
      language === "vi"
        ? [
            ["Ôn thi tự động", "exam"],
            ["Lịch học lặp lại", "recurrence"],
            ["Mẫu kế hoạch", "templates"],
            ["Báo cáo học tập", "reports"],
            ["Nhắc deadline", "reminders"],
          ]
        : [
            ["Automatic exam planning", "exam"],
            ["Recurring classes", "recurrence"],
            ["Plan templates", "templates"],
            ["Study reports", "reports"],
            ["Deadline reminders", "reminders"],
          ];
    await page
      .getByRole("button", {
        name: language === "vi" ? "Quản lý gói" : "Manage plan",
        exact: true,
      })
      .focus();
    for (const [label, filename] of tools) {
      await page.keyboard.press("Tab");
      const button = page.getByRole("button", { name: label, exact: true });
      await expect(button).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.locator("[data-pro-tool]:not([hidden]) .pro-panel"),
      ).toBeVisible();
      await capture(page, testInfo, `${filename}-${language}-${theme}.png`);
    }
    await expectNoPermissionRequest(page);
  });
}
