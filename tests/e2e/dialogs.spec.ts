import { test, expect, type Locator } from "@playwright/test";
import { glassPlan, loadGlass } from "../fixtures/glass";

async function frameAligned(dialog: Locator) {
  const bounds = await dialog.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const footer = node.querySelector<HTMLElement>(".dialog-actions")!;
    const actions = footer.getBoundingClientRect();
    return {
      left: actions.left - rect.left - parseFloat(style.borderLeftWidth),
      right: rect.left + node.clientLeft + node.clientWidth - actions.right,
      bottom: rect.top + node.clientTop + node.clientHeight - actions.bottom,
    };
  });
  expect(Math.abs(bounds.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.right)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.bottom)).toBeLessThanOrEqual(1);
}

test("dialog actions meet the frame and remain visible in a scrolling editor", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const plan = glassPlan();
  plan.weeks[0].projects[0].tasks[0].subtasks = Array.from(
    { length: 12 },
    (_, index) => ({
      id: `dialog-step-${index}`,
      day: 3,
      dayOrder: (index + 1) * 1024,
      weight: 1,
      note: `Ghi chú bước ${index + 1}`,
      done: false,
      missed: [],
    }),
  );
  await loadGlass(page, false, plan);
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByLabel("Giao diện", { exact: true }).selectOption(theme);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    for (const width of info.project.name === "mobile"
      ? [390, 320]
      : [1440, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator('[data-step-id="dialog-step-0"] .card-menu').click();
      const move = page.getByRole("dialog", {
        name: "Chuyển ngày",
        exact: true,
      });
      await frameAligned(move);
      await expect(
        move.getByRole("button", { name: "Hủy", exact: true }),
      ).toBeVisible();
      await expect(
        move.getByRole("button", { name: "Chuyển", exact: true }),
      ).toBeVisible();
      await move.getByRole("button", { name: "Hủy", exact: true }).click();
      await page.locator('[data-step-id="dialog-step-0"] .task-title').click();
      const editor = page.getByRole("dialog", {
        name: "Sửa công việc",
        exact: true,
      });
      await editor.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await frameAligned(editor);
      await expect(
        editor.getByRole("button", { name: "Lưu", exact: true }),
      ).toBeVisible();
      await editor.getByRole("button", { name: "Hủy", exact: true }).click();
    }
  }
});
