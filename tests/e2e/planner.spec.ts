import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const seed = {
  version: 1,
  weeks: [
    {
      id: "week_2026-10-05",
      start: "2026-10-05",
      ended: false,
      projects: [
        {
          id: "p-study",
          name: "Study",
          tasks: [
            {
              id: "task-read",
              name: "Read",
              note: "",
              done: false,
              subtasks: [
                {
                  id: "step-easy",
                  day: 0,
                  weight: 1,
                  note: "easy step",
                  done: false,
                  missed: [],
                },
                {
                  id: "step-hard",
                  day: 3,
                  weight: 3,
                  note: "hard step",
                  done: false,
                  missed: [],
                },
              ],
            },
            {
              id: "task-write",
              name: "Write",
              note: "",
              done: false,
              subtasks: [],
            },
          ],
        },
      ],
    },
  ],
};
test("exports a real backup file and imports it without duplicating existing data", async ({
  page,
}) => {
  await loadFixture(page);
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
  const file = await downloaded;
  const path = await file.path();
  if (!path) throw new Error("Backup download missing");
  const backup = JSON.parse(await readFile(path, "utf8"));
  expect(backup.version).toBe(1);
  expect(
    backup.weeks[0].projects[0].tasks.map(
      (task: { name: string }) => task.name,
    ),
  ).toEqual(["Read", "Write"]);
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(backup));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
  await expect(page.getByTestId("week-progress")).toContainText("0/5");
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await expect(page.locator(".project-title")).toHaveText(["Study"]);
});
async function loadFixture(page: import("@playwright/test").Page) {
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(seed));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
}

test("creates a project and task, finishes work, and restores deletion with undo", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByLabel("Tên dự án", { exact: true }).fill("Study");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm công việc", exact: true })
    .first()
    .click();
  await page.getByLabel("Tên công việc", { exact: true }).fill("Read chapter");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(
    page.getByTestId("day-work").getByText("Read chapter").first(),
  ).toBeVisible();
  await page
    .getByTestId("day-work")
    .getByRole("checkbox", { name: "Read chapter" })
    .first()
    .check();
  await expect(page.getByTestId("week-progress")).toContainText("100%");
  await page
    .getByTestId("day-work")
    .getByRole("button", { name: "Sửa Read chapter" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Xóa công việc", exact: true })
    .click();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(
    page.getByTestId("day-work").getByText("Read chapter").first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId("day-work").getByText("Read chapter").first(),
  ).toBeVisible();
});

test("remembers language/theme and reloads the PWA while offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByLabel("Ngôn ngữ", { exact: true }).selectOption("en");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "New project", exact: true }).first(),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "New project", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("copies across weeks, resets completion, carries pending work and updates stats", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loadFixture(page);
  await page
    .locator('[data-day="3"]')
    .getByRole("checkbox", { name: "Read" })
    .check();
  await expect(page.getByTestId("week-progress")).toContainText("60%");
  await page
    .getByRole("button", { name: "Sao chép kế hoạch", exact: true })
    .click();
  await page.getByRole("button", { name: "Sao chép", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await page.getByRole("button", { name: "Tuần sau", exact: true }).click();
  await page.getByRole("button", { name: "Dán kế hoạch", exact: true }).click();
  await page.getByLabel("Nội dung kế hoạch", { exact: true }).fill(copied);
  await page
    .getByRole("button", { name: "Thêm vào tuần", exact: true })
    .click();
  await expect(page.getByTestId("week-progress")).toContainText("0%");
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Kết thúc tuần", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Chuyển việc chưa xong sang tuần sau",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("week-progress")).toContainText("0/7");
  await page.getByRole("button", { name: "Thống kê", exact: true }).click();
  await expect(
    page.getByRole("main").getByText("60%", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lịch tuần", exact: true }).click();
  await expect(page.locator(".week-history")).toHaveCount(2);
});

test("moves a whole week without leaving its plan behind", async ({ page }) => {
  await loadFixture(page);
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Chuyển cả tuần", exact: true })
    .click();
  await page.getByLabel("Tuần đích", { exact: true }).fill("2026-10-12");
  await page.getByRole("button", { name: "Chuyển", exact: true }).click();
  await expect(page.getByTestId("week-progress")).toContainText("0/5");
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Tạo dự án", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lịch tuần", exact: true }).click();
  await expect(page.locator(".week-history")).toHaveCount(1);
});

test("moves a step to the next day with keyboard drag and cancels a second drag", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Keyboard drag is exercised on the desktop; touch has its own flow.",
  );
  await loadFixture(page);
  const handle = page.locator('[data-day="0"]').getByRole("button", {
    name: "Kéo hoặc nhấn Space để di chuyển",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText("Thứ Ba");
  await page.keyboard.press("Space");
  await expect(
    page.locator('[data-day="1"]').getByRole("checkbox", { name: "Read" }),
  ).toBeVisible();
  const moved = page.locator('[data-day="1"]').getByRole("button", {
    name: "Kéo hoặc nhấn Space để di chuyển",
    exact: true,
  });
  await moved.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(
    page.locator('[data-day="1"]').getByRole("checkbox", { name: "Read" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-day="2"]').getByRole("checkbox", { name: "Read" }),
  ).toHaveCount(0);
});

test("preserves task order when editing a task note", async ({ page }) => {
  await loadFixture(page);
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sửa Read", exact: true })
    .click();
  await page
    .getByLabel("Ghi chú", { exact: true })
    .first()
    .fill("changed note");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await expect(page.locator(".manager-task-name")).toHaveText([
    "Read",
    "Write",
  ]);
});

test("adds another project from the project manager on either device", async ({
  page,
}) => {
  await loadFixture(page);
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByLabel("Tên dự án", { exact: true }).fill("Second project");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await expect(page.locator(".project-title")).toHaveText([
    "Study",
    "Second project",
  ]);
});

test("moves a step with a touch drag onto a mobile day tab", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Touch is exercised on the mobile viewport.",
  );
  await loadFixture(page);
  const handle = page.locator('[data-day="3"]').getByRole("button", {
    name: "Kéo hoặc nhấn Space để di chuyển",
    exact: true,
  });
  const source = await handle.boundingBox(),
    target = await page
      .getByRole("button", { name: "Thứ Sáu", exact: true })
      .boundingBox();
  if (!source || !target) throw new Error("Touch targets missing");
  const cdp = await context.newCDPSession(page),
    a = { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    b = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [a],
  });
  await expect(page.locator(".drag-preview")).toBeVisible();
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 },
      ],
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  }
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText("Thứ Sáu");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    page.locator('[data-day="4"]').getByRole("checkbox", { name: "Read" }),
  ).toBeVisible();
  await cdp.detach();
});
test("has accessible planner and task dialog in both themes", async ({
  page,
}) => {
  await loadFixture(page);
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByLabel("Giao diện", { exact: true }).selectOption(theme);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    const planner = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(planner.violations).toEqual([]);
    await page
      .getByRole("button", { name: "Thêm công việc", exact: true })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Thêm công việc",
    );
    const editor = await new AxeBuilder({ page })
      .include("dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(editor.violations).toEqual([]);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
  }
});
test("reorders projects with mouse and tasks with keyboard", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Project mouse/keyboard ordering is exercised on desktop.",
  );
  await loadFixture(page);
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByLabel("Tên dự án", { exact: true }).fill("Second");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  const handles = page.getByRole("button", {
      name: "Đổi thứ tự dự án",
      exact: true,
    }),
    a = await handles.nth(0).boundingBox(),
    b = await handles.nth(1).boundingBox();
  if (!a || !b) throw new Error("Project handles missing");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 40, {
    steps: 20,
  });
  await page.mouse.up();
  await expect(page.locator(".project-title")).toHaveText(["Second", "Study"]);
  const taskHandle = page
    .getByRole("button", { name: "Đổi thứ tự công việc", exact: true })
    .first();
  await taskHandle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('[id^="DndLiveRegion"]').filter({ hasText: "Write" }),
  ).toContainText("Write");
  await page.keyboard.press("Space");
  await expect(page.locator(".manager-task-name")).toHaveText([
    "Write",
    "Read",
  ]);
});
test("reports invalid JSON inside its dialog without replacing the plan", async ({
  page,
}) => {
  await loadFixture(page);
  await page.getByRole("button", { name: "Dán kế hoạch", exact: true }).click();
  await page
    .getByLabel("Nội dung kế hoạch", { exact: true })
    .fill('{"format":"wrong"}');
  await page
    .getByRole("button", { name: "Thêm vào tuần", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Dữ liệu không hợp lệ",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(page.getByTestId("week-progress")).toContainText("0/5");
});
test("ends without carry, reopens history, and restores a cleared board", async ({
  page,
}) => {
  await loadFixture(page);
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Kết thúc tuần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kết thúc, không chuyển việc", exact: true })
    .click();
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page.getByRole("button", { name: "Mở lại tuần", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mở lại tuần", exact: true })
    .click();
  await expect(
    page
      .getByTestId("day-work")
      .getByRole("checkbox", { name: "Read" })
      .first(),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Xóa kế hoạch tuần", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(page.getByTestId("week-progress")).toContainText("0/5");
});
