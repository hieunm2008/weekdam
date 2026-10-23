import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("opens the planner from the landing page", async ({ page }) => {
  await page.goto("/");
  const openPlanner = page
    .getByRole("link", {
      name: "Mở kế hoạch",
      exact: true,
    })
    .first();
  await expect(openPlanner).toHaveAttribute("href", "/app");
  await openPlanner.click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
});

test("lets visitors try completion and both planner previews", async ({
  page,
}) => {
  await page.goto("/");
  const read = page.getByRole("checkbox", {
    name: "Đọc 20 trang sách",
    exact: true,
  });
  await expect(read).not.toBeChecked();
  await expect(page.getByText("1/4", { exact: true })).toBeVisible();
  await read.check();
  await expect(page.getByText("2/4", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Lịch theo giờ", exact: true })
    .click();
  await expect(page.getByText("09:00", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Bảng theo ngày", exact: true })
    .click();
  await expect(read).toBeChecked();
});

test("finds relevant guide topics and recovers from an empty search", async ({
  page,
}) => {
  await page.goto("/guide");
  const firstWeek = page.getByRole("heading", {
    name: "Bắt đầu với tuần đầu tiên",
    exact: true,
  });
  const storage = page.getByRole("heading", {
    name: "Lưu, đồng bộ và sao lưu",
    exact: true,
  });
  const search = page.getByRole("textbox", {
    name: "Tìm trong hướng dẫn",
    exact: true,
  });
  await expect(firstWeek).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lịch theo giờ", exact: true }),
  ).toBeVisible();
  await search.fill("đồng bộ");
  await expect(storage).toBeVisible();
  await expect(firstWeek).not.toBeVisible();
  await search.fill("no-topic-xyz-123");
  await expect(page.getByText(/Không tìm thấy/i).first()).toBeVisible();
  await expect(storage).not.toBeVisible();
  await search.clear();
  await expect(firstWeek).toBeVisible();
});

test("keeps the selected language across guide navigation and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Chuyển sang tiếng Anh", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Switch to Vietnamese", exact: true }),
  ).toBeVisible();
  await page.goto("/guide");
  await expect(
    page.getByRole("button", { name: "Switch to Vietnamese", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to Vietnamese", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch to Vietnamese", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Tìm trong hướng dẫn", exact: true }),
  ).toBeVisible();
});

for (const route of ["/", "/guide"]) {
  test(`keeps ${route} accessible and within the viewport`, async ({
    page,
  }) => {
    // Axe reads colors while scrolling. Audit settled content; motion has
    // its own test below.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test(`respects reduced motion on ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await page
      .getByRole("main")
      .evaluate((main) => main.scrollIntoView({ block: "end" }));
    const movingAnimations = await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => {
          const timing = animation.effect?.getComputedTiming();
          return (
            animation.playState === "running" &&
            typeof timing?.duration === "number" &&
            timing.duration > 100
          );
        }).length,
    );
    expect(movingAnimations).toBe(0);
  });
}
