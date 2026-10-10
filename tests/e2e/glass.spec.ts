import { test, expect, type Page } from "@playwright/test";
import { loadGlass, ordered, keyboardMove, glassPlan } from "../fixtures/glass";
import AxeBuilder from "@axe-core/playwright";
async function filter(page: Page, value: string) {
  const select = page.getByRole("combobox", { name: "Lọc dự án", exact: true });
  if (!(await select.isVisible().catch(() => false)))
    await page
      .getByRole("button", { name: "Quản lý tuần", exact: true })
      .click();
  await select.selectOption(value);
}

test("drags card bodies across projects and preserves rank through reload and undo", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Mouse body drag has a desktop flow; touch is separate.",
  );
  await loadGlass(page);
  await ordered(page, ["Alpha", "Beta 1", "Gamma", "Beta 2"]);
  const source = await page
    .locator('[data-step-id="glass-b2"] .project-tag')
    .boundingBox();
  const target = await page.locator('[data-step-id="glass-a"]').boundingBox();
  if (!source || !target) throw Error("Drag coordinates missing");
  await page.mouse.move(source.x + 10, source.y + 5);
  await page.mouse.down();
  await page.mouse.move(source.x + 22, source.y + 5, { steps: 3 });
  await expect(page.locator(".drag-preview")).toBeVisible();
  await page.mouse.move(target.x + target.width / 2, target.y + 4, {
    steps: 15,
  });
  await expect(page.locator('[data-step-id="glass-a"]')).toHaveAttribute(
    "data-insertion",
    "before",
  );
  await page.mouse.up();
  await ordered(page, ["Beta 2", "Alpha", "Beta 1", "Gamma"]);
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await ordered(page, ["Alpha", "Beta 1", "Gamma", "Beta 2"]);
  await keyboardMove(page, "glass-b1", "ArrowUp");
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  await page.reload();
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  await page.locator('[data-step-id="glass-b1"] input').check();
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  await expect(page.locator(".drag-preview")).toHaveCount(0);
  await page
    .locator('[data-step-id="glass-b2"]')
    .evaluate((node) => node.scrollIntoView({ block: "center" }));
  const moving = await page
    .locator('[data-step-id="glass-a"] .project-tag')
    .boundingBox();
  const bottom = await page.locator('[data-step-id="glass-b2"]').boundingBox();
  if (!moving || !bottom) throw Error("After-drop coordinates missing");
  await page.mouse.move(moving.x + 10, moving.y + 5);
  await page.mouse.down();
  await page.mouse.move(moving.x + 22, moving.y + 5, { steps: 3 });
  await expect(
    page.locator('.drag-preview[data-overlay-id="glass-a"]'),
  ).toBeVisible();
  await page.mouse.move(
    bottom.x + bottom.width / 2,
    bottom.y + bottom.height - 3,
    { steps: 15 },
  );
  await expect(page.locator('[data-step-id="glass-b2"]')).toHaveAttribute(
    "data-insertion",
    "after",
  );
  await page.mouse.up();
  await ordered(page, ["Beta 1", "Gamma", "Beta 2", "Alpha"]);
  const cancel = await page
    .locator('[data-step-id="glass-a"] .project-tag')
    .boundingBox();
  if (!cancel) throw Error("Invalid-drop coordinates missing");
  await page.mouse.move(cancel.x + 10, cancel.y + 5);
  await page.mouse.down();
  await page.mouse.move(cancel.x + 22, cancel.y + 5, { steps: 3 });
  await expect(
    page.locator('.drag-preview[data-overlay-id="glass-a"]'),
  ).toBeVisible();
  await page.mouse.move(10, 10, { steps: 10 });
  await page.mouse.up();
  await ordered(page, ["Beta 1", "Gamma", "Beta 2", "Alpha"]);
  await page.reload();
  await ordered(page, ["Beta 1", "Gamma", "Beta 2", "Alpha"]);
});

test("touches a card body to reorder and scrolls before activation without dragging", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Real touch events use the mobile context.",
  );
  await loadGlass(page);
  const cdp = await context.newCDPSession(page);
  const source = await page
    .locator('[data-step-id="glass-b1"] .project-tag')
    .boundingBox();
  const target = await page.locator('[data-step-id="glass-a"]').boundingBox();
  if (!source || !target) throw Error("Touch coordinates missing");
  const a = { x: source.x + 12, y: source.y + 5 },
    b = { x: target.x + target.width / 2, y: target.y + 3 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [a],
  });
  await expect(page.locator(".drag-preview")).toBeVisible();
  for (let i = 1; i <= 15; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: a.x + ((b.x - a.x) * i) / 15, y: a.y + ((b.y - a.y) * i) / 15 },
      ],
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  const rect = await page
    .locator('[data-step-id="glass-b1"] .project-tag')
    .boundingBox();
  if (!rect) throw Error("Scroll source missing");
  const start = { x: rect.x + 20, y: rect.y + 5 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: start.x, y: start.y - 65 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".drag-preview")).toHaveCount(0);
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
});

test("a quick swipe scrolls a dense mobile day without starting a drag", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Touch scroll needs the mobile context.",
  );
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:00Z"));
  await page.goto("/");
  const dense = glassPlan();
  dense.weeks[0].projects[0].tasks[0].subtasks = Array.from(
    { length: 20 },
    (_, i) => ({
      id: `scroll-${i}`,
      day: 3,
      dayOrder: (i + 1) * 1024,
      weight: 1 as const,
      note: "",
      done: false,
      missed: [],
    }),
  );
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(dense));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
  const cdp = await context.newCDPSession(page);
  const rect = await page
    .locator('[data-step-id="scroll-1"] .project-tag')
    .boundingBox();
  if (!rect) throw Error("Swipe coordinates missing");
  const start = { x: rect.x + 20, y: rect.y + 5 };
  const before = await page.evaluate(() => scrollY);
  const originalOrder = await page
    .locator('[data-day="3"] [data-step-id]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-step-id")),
    );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  for (let n = 1; n <= 6; n++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x, y: start.y - n * 20 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(before + 30);
  await expect(page.locator(".drag-preview")).toHaveCount(0);
  await expect(page.locator('[data-step-id="scroll-0"]')).toHaveCount(1);
  expect(
    await page
      .locator('[data-day="3"] [data-step-id]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-step-id")),
      ),
  ).toEqual(originalOrder);
});

test("keyboard reorder crosses task/project boundaries and cancellation changes nothing", async ({
  page,
}) => {
  await loadGlass(page);
  await page.locator('[data-step-id="glass-a"] .drag-handle').focus();
  await page.keyboard.press("Space");
  await expect(
    page.locator('.drag-preview[data-overlay-id="glass-a"]'),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-step-id="glass-b1"]')).toHaveAttribute(
    "data-insertion",
    "after",
  );
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await ordered(page, ["Alpha", "Beta 1", "Gamma", "Beta 2"]);
  await keyboardMove(page, "glass-a", "ArrowDown");
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  await keyboardMove(page, "glass-a", "ArrowUp");
  await ordered(page, ["Alpha", "Beta 1", "Gamma", "Beta 2"]);
  await keyboardMove(page, "glass-c", "ArrowUp");
  await ordered(page, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
  await page.locator('[data-step-id="glass-c"] .drag-handle').focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".drag-preview")).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await ordered(page, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
  await page.reload();
  await ordered(page, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
});

test("filtered reorder uses visible anchors while preserving hidden card positions", async ({
  page,
}) => {
  await loadGlass(page);
  await filter(page, "glass-p-b");
  await ordered(page, ["Beta 1", "Beta 2"]);
  await keyboardMove(page, "glass-b2", "ArrowUp");
  await ordered(page, ["Beta 2", "Beta 1"]);
  await filter(page, "");
  await ordered(page, ["Alpha", "Beta 2", "Beta 1", "Gamma"]);
  await page.reload();
  await ordered(page, ["Alpha", "Beta 2", "Beta 1", "Gamma"]);
});

test("ended weeks do not activate body dragging", async ({ page }) => {
  await loadGlass(page);
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Kết thúc tuần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kết thúc, không chuyển việc", exact: true })
    .click();
  await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
  const rect = await page
    .locator('[data-step-id="glass-a"] .project-tag')
    .boundingBox();
  if (!rect) throw Error("Readonly card missing");
  await page.mouse.move(rect.x + 8, rect.y + 4);
  await page.mouse.down();
  await page.mouse.move(rect.x + 30, rect.y + 4, { steps: 3 });
  await expect(page.locator(".drag-preview")).toHaveCount(0);
  await page.mouse.up();
  await ordered(page, ["Alpha", "Beta 1", "Gamma", "Beta 2"]);
});

test("keeps the page bounded at narrow widths and honors reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadGlass(page);
  for (const width of [1440, 1366, 1000, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await expect(page.locator(".day-tabs")).toBeVisible();
  await keyboardMove(page, "glass-b1", "ArrowUp");
  await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  expect(
    await page
      .locator('[data-step-id="glass-b1"]')
      .evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
});

test("preserves a legacy board when project hierarchy is reordered", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Project pointer reorder uses the desktop manager.",
  );
  await loadGlass(page);
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("plans", "readwrite");
        tx.objectStore("plans").put(data, "guest");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, glassPlan(true));
  await page.reload();
  await ordered(page, ["Alpha", "Beta 1", "Beta 2", "Gamma"]);
  await page
    .getByRole("button", { name: "Dự án", exact: true })
    .first()
    .click();
  const handles = page
    .getByRole("dialog")
    .getByRole("button", { name: "Đổi thứ tự dự án", exact: true });
  const a = await handles.nth(2).boundingBox(),
    b = await handles.nth(0).boundingBox();
  if (!a || !b) throw Error("Manager coordinates missing");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + a.height / 2, { steps: 2 });
  await page.mouse.move(b.x + b.width / 2, b.y + 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator(".project-title").first()).toContainText(
    "Project C",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await ordered(page, ["Alpha", "Beta 1", "Beta 2", "Gamma"]);
});

test("Stats and Weeks are accessible and heatmap has a single keyboard entry", async ({
  page,
}) => {
  await loadGlass(page);
  await page.getByRole("button", { name: "Quản lý tuần", exact: true }).click();
  await page
    .getByRole("button", { name: "Kết thúc tuần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kết thúc, không chuyển việc", exact: true })
    .click();
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await page.getByLabel("Giao diện", { exact: true }).selectOption(theme);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thống kê", exact: true })
      .filter({ visible: true })
      .click();
    await expect(page.locator('.heat[tabindex="0"]')).toHaveCount(1);
    const cells = page.locator(".heat");
    await cells.last().focus();
    await page.keyboard.press("ArrowUp");
    await expect(cells.nth(363)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(cells.nth(356)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(cells.first()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(cells.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(cells.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cells.last()).not.toBeFocused();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Lịch tuần", exact: true })
      .filter({ visible: true })
      .click();
    await expect(
      page.locator(".history-progress [role=progressbar]"),
    ).toHaveCount(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
