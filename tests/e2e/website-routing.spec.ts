import { expect, test } from "@playwright/test";
import { loadGlass } from "../fixtures/glass";

test("repeated feature and home links return to their scroll destinations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const features = page.locator("#features");
  const featureLink = page.getByRole("link", {
    name: "Tính năng",
    exact: true,
  });
  const homeLink = page.getByRole("link", {
    name: "weekdam · Trang chủ",
    exact: true,
  });
  await featureLink.click();
  await expect(page).toHaveURL(/\/#features$/);
  await expect
    .poll(() => features.evaluate((node) => node.getBoundingClientRect().top))
    .toBeLessThanOrEqual(120);
  const featureHistory = await page.evaluate(() => history.length);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await featureLink.click();
  await expect
    .poll(() => features.evaluate((node) => node.getBoundingClientRect().top))
    .toBeLessThanOrEqual(120);
  expect(await page.evaluate(() => history.length)).toBe(featureHistory);

  await homeLink.click();
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);
  const homeHistory = await page.evaluate(() => history.length);
  await homeLink.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => history.length)).toBe(homeHistory);
});

test("planner links open the guide and browser history returns to the planner", async ({
  page,
}) => {
  await loadGlass(page);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("sync-status")).toBeVisible();
  await expect(page.locator('[data-step-id="glass-a"] .task-title')).toHaveText(
    "Alpha",
  );
  await page.getByRole("link", { name: "Hướng dẫn", exact: true }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/guide$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("sync-status")).toBeVisible();
  await expect(page.locator('[data-step-id="glass-a"] .task-title')).toHaveText(
    "Alpha",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.getByRole("link", { name: "Trang chủ", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".app-shell")).toHaveCount(0);
});

test("direct guide entry applies saved language and dark appearance", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("weekdam:language", "en");
    localStorage.setItem("weekdam:theme", "dark");
  });
  await page.goto("/guide");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page).toHaveTitle(/guide/i);
  await expect(page.locator(".app-shell")).toHaveCount(0);
});
