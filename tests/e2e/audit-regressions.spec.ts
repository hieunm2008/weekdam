import { expect, test, type Page } from "@playwright/test";
import { glassPlan, loadGlass } from "../fixtures/glass";

async function draftProject(page: Page, name: string) {
  await page.getByRole("button", { name: "Dự án", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByLabel("Tên dự án", { exact: true }).fill(name);
}

test("Guest tabs receive other tabs' saved projects and keep both after reload", async ({
  page,
  context,
}) => {
  await page.goto("/app");
  const other = await context.newPage();
  await other.goto("/app");
  await draftProject(page, "Guest A");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await other.getByRole("button", { name: "Dự án", exact: true }).click();
  await expect(
    other.getByRole("button", { name: "Guest A", exact: true }),
  ).toBeVisible();
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await other.getByLabel("Tên dự án", { exact: true }).fill("Guest B");
  await other.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(other.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  await page.reload();
  await page.getByRole("button", { name: "Dự án", exact: true }).click();
  await expect(page.locator(".project-title")).toHaveText([
    "Guest A",
    "Guest B",
  ]);
});

test("Guest projects saved at the same time from two open drafts both survive", async ({
  page,
  context,
}) => {
  await page.goto("/app");
  const other = await context.newPage();
  await other.goto("/app");
  await draftProject(page, "Concurrent A");
  await draftProject(other, "Concurrent B");
  await Promise.all([
    page.getByRole("button", { name: "Lưu", exact: true }).click(),
    other.getByRole("button", { name: "Lưu", exact: true }).click(),
  ]);
  await expect(page.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  await expect(other.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  for (const tab of [page, other]) {
    await tab.reload();
    await tab.getByRole("button", { name: "Dự án", exact: true }).click();
    await expect(tab.locator(".project-title")).toHaveCount(2);
    await expect(
      tab.getByRole("button", { name: "Concurrent A", exact: true }),
    ).toBeVisible();
    await expect(
      tab.getByRole("button", { name: "Concurrent B", exact: true }),
    ).toBeVisible();
  }
});

test("Guest undo removes only this tab's project after another tab adds to the same week", async ({
  page,
  context,
}) => {
  await page.goto("/app");
  await draftProject(page, "Undo A");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  const other = await context.newPage();
  await other.goto("/app");
  await draftProject(other, "Keep B");
  await other.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(other.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  await page.getByRole("button", { name: "Dự án", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Keep B", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(page.getByTestId("sync-status")).toContainText(
    "Đã lưu trên thiết bị",
  );
  await page.reload();
  await page.getByRole("button", { name: "Dự án", exact: true }).click();
  await expect(page.locator(".project-title")).toHaveText(["Keep B"]);
});

for (const remove of ["delete", "day", "calendar"] as const) {
  test(`removing the final completed step via ${remove} keeps the task completed`, async ({
    page,
  }) => {
    const plan = glassPlan();
    plan.weeks[0].projects = [plan.weeks[0].projects[0]];
    const task = plan.weeks[0].projects[0].tasks[0];
    task.subtasks = [task.subtasks[0]];
    if (remove === "calendar") {
      // Legacy plans can store a stale task.done despite all steps being done.
      task.subtasks[0].done = true;
      task.subtasks[0].startTime = "09:00";
      task.subtasks[0].endTime = "10:00";
    }
    await loadGlass(page, false, plan);
    if (remove !== "calendar")
      await page.getByRole("checkbox", { name: "Alpha", exact: true }).check();
    await expect(page.getByTestId("week-progress")).toContainText("100%");
    if (remove === "calendar") {
      await page
        .getByRole("button", { name: "Lịch theo giờ", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Sửa lịch Alpha · 09:00–10:00",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Xóa khung giờ", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Sửa Alpha", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: remove === "delete" ? "Xóa" : "Thứ Năm",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "Lưu", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Lịch theo giờ", exact: true })
      .click();
    await expect(
      page.getByRole("checkbox", { name: "Alpha", exact: true }).first(),
    ).toBeChecked();
    await expect(page.getByTestId("week-progress")).toContainText("100%");
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Alpha", exact: true }).first(),
    ).toBeChecked();
  });
}

for (const language of ["vi", "en"] as const) {
  test(`copy dialog shows difficulty units rather than task count in ${language}`, async ({
    page,
  }) => {
    const plan = glassPlan();
    plan.weeks[0].projects = [plan.weeks[0].projects[0]];
    const project = plan.weeks[0].projects[0];
    project.tasks[0].subtasks[0].weight = 3;
    // 3 + 2 for scheduled steps, plus 1 for a task without steps = 6.
    project.tasks.push({
      id: "unscheduled",
      name: "No steps",
      note: "",
      done: false,
      subtasks: [],
    });
    await loadGlass(page, false, plan);
    if (language === "en") {
      await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
      await page.getByLabel("Ngôn ngữ", { exact: true }).selectOption("en");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Close", exact: true })
        .click();
    }
    await page
      .getByRole("button", {
        name: language === "vi" ? "Quản lý tuần" : "Manage week",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: language === "vi" ? "Sao chép kế hoạch" : "Copy plan",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("dialog").getByRole("checkbox"),
    ).toHaveAccessibleName(
      language === "vi" ? "Project A 6 đơn vị" : "Project A 6 units",
    );
  });
}
