import { test, expect, type Page } from "@playwright/test";
import { glassPlan, loadGlass } from "../fixtures/glass";

function taskList(page: Page) {
  return page.getByRole("region", { name: "Danh sách công việc", exact: true });
}

function scheduleDialog(page: Page) {
  return page.getByRole("dialog", { name: "Xếp lịch công việc", exact: true });
}

function eventEditor(page: Page, name: string, start: string, end: string) {
  return page.getByRole("button", {
    name: `Sửa lịch ${name} · ${start}–${end}`,
    exact: true,
  });
}

async function openCalendar(page: Page) {
  await page
    .getByRole("button", { name: "Lịch theo giờ", exact: true })
    .click();
  await expect(taskList(page)).toBeVisible();
}

async function addTasks(page: Page, names: string[]) {
  await page
    .getByRole("button", { name: "Thêm nhiều công việc", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Tên các công việc", exact: true })
    .fill(names.join("\n"));
  await page
    .getByRole("button", { name: "Thêm vào danh sách", exact: true })
    .click();
  for (const name of names) {
    await expect(
      taskList(page).getByRole("button", {
        name: `Lên lịch ${name}`,
        exact: true,
      }),
    ).toBeVisible();
  }
}

async function scheduleTask(
  page: Page,
  name: string,
  date: string,
  start: string,
  end: string,
) {
  await taskList(page)
    .getByRole("button", { name: `Lên lịch ${name}`, exact: true })
    .click();
  const dialog = scheduleDialog(page);
  await dialog.getByLabel("Ngày thực hiện", { exact: true }).fill(date);
  await dialog.getByLabel("Giờ bắt đầu", { exact: true }).fill(start);
  await dialog.getByLabel("Giờ kết thúc", { exact: true }).fill(end);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

function overlapPlan() {
  const sample = glassPlan();
  const tasks = sample.weeks[0].projects[1].tasks;
  for (const task of tasks) {
    task.subtasks[0].startTime = "09:00";
    task.subtasks[0].endTime = "10:30";
  }
  tasks[0].subtasks[0].weight = 2;
  tasks[1].subtasks[0].weight = 3;
  return sample;
}

test("opens the hourly calendar with the current week task list", async ({
  page,
}) => {
  await loadGlass(page, true);
  await openCalendar(page);
  await expect(
    taskList(page).getByRole("button", { name: "Lên lịch Alpha", exact: true }),
  ).toBeVisible();
  const untimed = page.getByRole("region", {
    name: "Công việc chưa có giờ",
    exact: true,
  });
  await expect(untimed).toBeVisible();
  await expect(
    untimed.locator('[data-calendar-step-id="glass-a"]'),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Bảng theo ngày", exact: true })
    .click();
  await expect(
    page.locator('[data-day="3"] [data-step-id="glass-a"]'),
  ).toBeVisible();
  await openCalendar(page);
  await page.reload();
  await expect(taskList(page)).toBeVisible();
  await expect(
    untimed.locator('[data-calendar-step-id="glass-a"]'),
  ).toBeVisible();
});

test("adds an unscheduled list and persists several valid time blocks for one task", async ({
  page,
}) => {
  await loadGlass(page);
  await openCalendar(page);
  await addTasks(page, ["Ôn thuật toán", "Soạn báo cáo", "Đọc sách"]);
  await expect(
    page.locator("[data-calendar-day] [data-calendar-step-id]"),
  ).toHaveCount(0);

  await taskList(page)
    .getByRole("button", { name: "Lên lịch Ôn thuật toán", exact: true })
    .click();
  const dialog = scheduleDialog(page);
  await dialog.getByLabel("Ngày thực hiện", { exact: true }).fill("2026-10-08");
  await dialog.getByLabel("Giờ bắt đầu", { exact: true }).fill("08:15");
  for (const invalidEnd of ["08:00", "08:15"]) {
    await dialog.getByLabel("Giờ kết thúc", { exact: true }).fill(invalidEnd);
    await expect(
      dialog.getByRole("button", { name: "Lưu", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByRole("alert")).toContainText("Giờ kết thúc");
    await expect(
      page.locator("[data-calendar-day] [data-calendar-step-id]"),
    ).toHaveCount(0);
  }
  await dialog.getByLabel("Giờ kết thúc", { exact: true }).fill("09:45");
  await dialog
    .getByRole("combobox", { name: "Độ khó", exact: true })
    .selectOption("2");
  await expect(
    dialog.getByRole("button", { name: "Lưu", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await scheduleTask(page, "Ôn thuật toán", "2026-10-08", "14:00", "15:00");
  const early = eventEditor(page, "Ôn thuật toán", "08:15", "09:45");
  const late = eventEditor(page, "Ôn thuật toán", "14:00", "15:00");
  await expect(early).toHaveCount(1);
  await expect(late).toHaveCount(1);
  await expect(
    page.locator('[data-calendar-day="3"] [data-calendar-step-id]'),
  ).toHaveCount(2);
  await expect(
    taskList(page).getByRole("button", {
      name: "Lên lịch Ôn thuật toán",
      exact: true,
    }),
  ).toHaveCount(1);

  await page
    .getByRole("button", { name: "Bảng theo ngày", exact: true })
    .click();
  await expect(
    page
      .locator('[data-day="3"] [data-step-id] .task-title')
      .filter({ hasText: "Ôn thuật toán" }),
  ).toHaveCount(2);
  await openCalendar(page);
  await page.reload();
  await expect(early).toHaveCount(1);
  await expect(late).toHaveCount(1);
  await early.scrollIntoViewIfNeeded();
  await early.click();
  await expect(
    dialog.getByLabel("Ngày thực hiện", { exact: true }),
  ).toHaveValue("2026-10-08");
  await expect(dialog.getByLabel("Giờ bắt đầu", { exact: true })).toHaveValue(
    "08:15",
  );
  await expect(dialog.getByLabel("Giờ kết thúc", { exact: true })).toHaveValue(
    "09:45",
  );
  await expect(
    dialog.getByRole("combobox", { name: "Độ khó", exact: true }),
  ).toHaveValue("2");
});

test("keeps future week tasks and dated sessions separate from the current week", async ({
  page,
}) => {
  await loadGlass(page);
  await openCalendar(page);
  const jump = page.getByLabel("Chọn tuần", { exact: true });
  await jump.fill("2026-10-21");
  await expect(jump).toHaveValue("2026-10-19");
  await expect(
    taskList(page).getByRole("button", { name: "Lên lịch Alpha", exact: true }),
  ).toHaveCount(0);
  await addTasks(page, ["Chuẩn bị tuần mới"]);
  await scheduleTask(page, "Chuẩn bị tuần mới", "2026-10-22", "10:00", "11:15");
  const event = eventEditor(page, "Chuẩn bị tuần mới", "10:00", "11:15");
  await expect(
    page.locator('[data-calendar-day="3"]').getByRole("button", {
      name: "Sửa lịch Chuẩn bị tuần mới · 10:00–11:15",
      exact: true,
    }),
  ).toHaveCount(1);

  await jump.fill("2026-10-05");
  await expect(
    taskList(page).getByRole("button", { name: "Lên lịch Alpha", exact: true }),
  ).toBeVisible();
  await expect(
    taskList(page).getByRole("button", {
      name: "Lên lịch Chuẩn bị tuần mới",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(event).toHaveCount(0);
  await jump.fill("2026-10-19");
  await expect(event).toHaveCount(1);
  await page.reload();
  await expect(jump).toHaveValue("2026-10-19");
  await event.scrollIntoViewIfNeeded();
  await event.click();
  await expect(
    scheduleDialog(page).getByLabel("Ngày thực hiện", { exact: true }),
  ).toHaveValue("2026-10-22");
});

test("places overlapping sessions side by side without overflowing narrow screens", async ({
  page,
}) => {
  await loadGlass(page, false, overlapPlan());
  await openCalendar(page);
  const first = page.locator('[data-calendar-step-id="glass-b1"]');
  const second = page.locator('[data-calendar-step-id="glass-b2"]');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await eventEditor(
      page,
      "Beta 1",
      "09:00",
      "10:30",
    ).scrollIntoViewIfNeeded();
    await expect(eventEditor(page, "Beta 1", "09:00", "10:30")).toBeVisible();
    await expect(eventEditor(page, "Beta 2", "09:00", "10:30")).toBeVisible();
    const a = await first.boundingBox(),
      b = await second.boundingBox();
    if (!a || !b) throw Error("Overlapping session bounds missing");
    expect(
      a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1,
      "Concurrent sessions must each remain clickable",
    ).toBe(true);
    expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await expect(
    first.getByRole("img", { name: "Độ khó: Vừa", exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole("img", { name: "Độ khó: Nặng", exact: true }),
  ).toBeVisible();
});

test("keeps adjacent short sessions from covering each other", async ({
  page,
}) => {
  const sample = glassPlan();
  const alpha = sample.weeks[0].projects[0].tasks[0].subtasks[0];
  alpha.startTime = "12:00";
  alpha.endTime = "12:10";
  const gamma = sample.weeks[0].projects[2].tasks[0].subtasks[0];
  gamma.startTime = "12:10";
  gamma.endTime = "12:20";
  await loadGlass(page, false, sample);
  await openCalendar(page);
  const first = eventEditor(page, "Alpha", "12:00", "12:10");
  const second = eventEditor(page, "Gamma", "12:10", "12:20");
  await first.scrollIntoViewIfNeeded();
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const a = await first.boundingBox(),
    b = await second.boundingBox();
  if (!a || !b) throw Error("Short session bounds missing");
  expect(
    a.y + a.height,
    "Earlier session must not cover the next time slot",
  ).toBeLessThanOrEqual(b.y);
  await second.click();
  await expect(
    scheduleDialog(page).getByLabel("Giờ bắt đầu", { exact: true }),
  ).toHaveValue("12:10");
});

test("scrolls the mobile calendar when swiping a session before drag activation", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Native touch scrolling needs the mobile context.",
  );
  const sample = glassPlan();
  const step = sample.weeks[0].projects[1].tasks[0].subtasks[0];
  step.startTime = "09:00";
  step.endTime = "10:30";
  await loadGlass(page, false, sample);
  await openCalendar(page);
  await page
    .getByRole("button", { name: "Thu gọn danh sách công việc", exact: true })
    .click();
  const editor = eventEditor(page, "Beta 1", "09:00", "10:30");
  await editor.scrollIntoViewIfNeeded();
  const bounds = await editor.boundingBox();
  if (!bounds) throw Error("Touch session bounds missing");
  const scroller = page.locator(".calendar-scroll");
  const before = await scroller.evaluate((node) => node.scrollTop);
  const point = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  for (let n = 1; n <= 6; n++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x, y: point.y - n * 20 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(before + 30);
  await expect(editor).toHaveCount(1);
  await expect(page.locator(".calendar-drag-preview")).toHaveCount(0);
});

test("moves a mobile session after deliberately holding it for drag activation", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Native touch dragging needs the mobile context.",
  );
  const sample = glassPlan();
  const step = sample.weeks[0].projects[1].tasks[0].subtasks[0];
  step.startTime = "09:00";
  step.endTime = "10:30";
  await loadGlass(page, false, sample);
  await openCalendar(page);
  await page
    .getByRole("button", { name: "Thu gọn danh sách công việc", exact: true })
    .click();
  const editor = eventEditor(page, "Beta 1", "09:00", "10:30");
  await editor.scrollIntoViewIfNeeded();
  const bounds = await editor.boundingBox();
  if (!bounds) throw Error("Touch drag session bounds missing");
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + 20 };
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await expect(page.locator(".calendar-drag-preview")).toBeVisible();
  for (let n = 1; n <= 6; n++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x, y: point.y + n * 5 }],
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
  const moved = eventEditor(page, "Beta 1", "09:30", "11:00");
  await expect(moved).toHaveCount(1);
  await expect(editor).toHaveCount(0);
  await page.reload();
  await expect(moved).toHaveCount(1);
});

test("drags a scheduled session to another day and persists its shifted time", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Pointer dragging uses the desktop calendar; touch scheduling uses the editor.",
  );
  const sample = glassPlan();
  const step = sample.weeks[0].projects[1].tasks[0].subtasks[0];
  step.startTime = "09:00";
  step.endTime = "10:00";
  await loadGlass(page, false, sample);
  await openCalendar(page);
  const source = eventEditor(page, "Beta 1", "09:00", "10:00");
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox();
  const destination = await page
    .locator('[data-calendar-day="4"]')
    .boundingBox();
  if (!a || !destination) throw Error("Calendar drag coordinates missing");
  const x = a.x + a.width / 2,
    y = a.y + Math.min(20, a.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y, { steps: 3 });
  await page.mouse.move(destination.x + destination.width / 2, y + 30, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(
    page.locator('[data-calendar-day="4"]').getByRole("button", {
      name: "Sửa lịch Beta 1 · 09:30–10:30",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-calendar-day="3"] [data-calendar-step-id="glass-b1"]'),
  ).toHaveCount(0);
  await page.reload();
  const moved = eventEditor(page, "Beta 1", "09:30", "10:30");
  await moved.scrollIntoViewIfNeeded();
  await moved.click();
  const dialog = scheduleDialog(page);
  await expect(
    dialog.getByLabel("Ngày thực hiện", { exact: true }),
  ).toHaveValue("2026-10-09");
  await expect(dialog.getByLabel("Giờ bắt đầu", { exact: true })).toHaveValue(
    "09:30",
  );
  await expect(dialog.getByLabel("Giờ kết thúc", { exact: true })).toHaveValue(
    "10:30",
  );
});
