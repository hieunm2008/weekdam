import { expect, type Page } from "@playwright/test";
import type { Plan } from "../../src/domain";
export function glassPlan(legacy = false): Plan {
  const step = (id: string, day: number, order: number, weight: 1 | 2 = 1) => ({
    id,
    day,
    weight,
    note: "",
    done: false,
    missed: [],
    ...(legacy ? {} : { dayOrder: order }),
  });
  return {
    version: 1,
    weeks: [
      {
        id: "week_2026-10-05",
        start: "2026-10-05",
        ended: false,
        projects: [
          {
            id: "glass-p-a",
            name: "Project A",
            tasks: [
              {
                id: "glass-t-a",
                name: "Alpha",
                note: "",
                done: false,
                subtasks: [
                  step("glass-a", 3, 1024),
                  step("glass-other", 4, 1024, 2),
                ],
              },
            ],
          },
          {
            id: "glass-p-b",
            name: "Project B",
            tasks: [
              {
                id: "glass-t-b1",
                name: "Beta 1",
                note: "",
                done: false,
                subtasks: [step("glass-b1", 3, 2048)],
              },
              {
                id: "glass-t-b2",
                name: "Beta 2",
                note: "",
                done: false,
                subtasks: [step("glass-b2", 3, 4096)],
              },
            ],
          },
          {
            id: "glass-p-c",
            name: "Project C",
            tasks: [
              {
                id: "glass-t-c",
                name: "Gamma",
                note: "",
                done: false,
                subtasks: [step("glass-c", 3, 3072)],
              },
            ],
          },
        ],
      },
    ],
  };
}
export async function loadGlass(
  page: Page,
  legacy = false,
  sample: Plan = glassPlan(legacy),
) {
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:00Z"));
  await page.goto("/app");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(sample));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
}
export async function ordered(page: Page, names: string[], day = 3) {
  await expect(
    page.locator(`[data-day="${day}"] [data-step-id] .task-title`),
  ).toHaveText(names);
}
export async function keyboardMove(page: Page, id: string, key: string) {
  const grip = page.locator(`[data-step-id="${id}"] .drag-handle`);
  const live = page.locator('[id^="DndLiveRegion"]');
  await grip.focus();
  await page.keyboard.press("Space");
  await expect(
    page.locator(`.drag-preview[data-overlay-id="${id}"]`),
  ).toBeVisible();
  await expect(grip).toHaveAttribute("aria-pressed", "true");
  await expect(live).toContainText(/^(Đã nhấc|Picked up)/);
  await page.keyboard.press(key);
  // Wait for the app's destination state before dropping. Sending both keys in
  // one render turn can finish the drag before the keyboard sensor measures it.
  await expect(live).toContainText(/^(Đích:|Destination:)/);
  await page.keyboard.press("Space");
  await expect(
    page.locator(`.drag-preview[data-overlay-id="${id}"]`),
  ).toHaveCount(0);
}
