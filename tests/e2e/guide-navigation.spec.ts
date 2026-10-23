import { expect, test } from "@playwright/test";

test("keeps the selected guide topic in the URL through reload and next-topic navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/guide");
  const topics = page.getByRole("navigation", { name: "Nội dung hướng dẫn" });
  await topics.getByRole("link", { name: /Lịch theo giờ/ }).click();
  await expect(page).toHaveURL(/\/guide#guide-calendar$/);

  await page.reload();
  const calendar = page.getByRole("heading", {
    name: "Lịch theo giờ",
    exact: true,
  });
  await expect(calendar).toBeInViewport();
  await expect
    .poll(() =>
      calendar.evaluate((heading) => {
        const header = document.querySelector(".site-header");
        return (
          heading.getBoundingClientRect().top -
          (header?.getBoundingClientRect().bottom ?? 0)
        );
      }),
    )
    .toBeGreaterThanOrEqual(0);

  await page
    .getByRole("article")
    .filter({ has: calendar })
    .getByRole("link", { name: "Quản lý tuần", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guide#guide-weeks$/);
  await expect(
    page.getByRole("heading", { name: "Quản lý tuần", exact: true }),
  ).toBeInViewport();
});

test("opens a guide topic in a new tab on Control-click", async ({
  page,
  context,
}) => {
  await page.goto("/guide");
  const calendarLink = page
    .getByRole("navigation", { name: "Nội dung hướng dẫn" })
    .getByRole("link", { name: /Lịch theo giờ/ });
  const newTab = context.waitForEvent("page", { timeout: 5000 });
  await calendarLink.click({ modifiers: ["Control"] });
  const topicPage = await newTab;
  await expect(topicPage).toHaveURL(/\/guide#guide-calendar$/);
  await expect(page).toHaveURL(/\/guide$/);
  await topicPage.close();
});

test("keeps a clicked guide heading below the sticky header", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/guide");
  await page
    .getByRole("navigation", { name: "Nội dung hướng dẫn" })
    .getByRole("link", { name: /Lịch theo giờ/ })
    .click();
  const calendar = page.getByRole("heading", {
    name: "Lịch theo giờ",
    exact: true,
  });
  await expect(calendar).toBeInViewport();
  await expect
    .poll(() =>
      calendar.evaluate((heading) => {
        const header = document.querySelector(".site-header");
        return (
          heading.getBoundingClientRect().top -
          (header?.getBoundingClientRect().bottom ?? 0)
        );
      }),
    )
    .toBeGreaterThanOrEqual(0);
});
