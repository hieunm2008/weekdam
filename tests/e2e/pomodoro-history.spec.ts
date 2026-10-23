import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Plan } from "../../src/domain";
import type { PomodoroSession } from "../../src/pomodoro";

const seed: Plan = {
  version: 1,
  weeks: [
    {
      id: "week_2026-10-05",
      start: "2026-10-05",
      ended: false,
      projects: [
        {
          id: "p-history",
          name: "History project",
          tasks: [
            {
              id: "task-history",
              name: "History task",
              note: "",
              done: false,
              subtasks: [
                {
                  id: "step-history",
                  day: 6,
                  weight: 1,
                  note: "",
                  done: false,
                  missed: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
async function openTimer(page: Page) {
  await page
    .getByRole("button", { name: "Pomodoro", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByTestId("pomodoro-page")).toBeVisible();
}
async function importBackup(page: Page, backup: Plan) {
  await page
    .getByRole("button", { name: "Cài đặt", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(backup));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
}
async function savedHistory(page: Page): Promise<PomodoroSession[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<PomodoroSession[]>((resolve, reject) => {
        const request = db
          .transaction("plans")
          .objectStore("plans")
          .get("guest");
        request.onsuccess = () =>
          resolve(request.result?.pomodoroSessions ?? []);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test("undoes the preceding planner edit while keeping a completed Pomodoro session", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-11T05:00:00Z") });
  await page.goto("/app");
  await importBackup(page, seed);
  const task = page
    .getByTestId("day-work")
    .getByRole("checkbox", { name: "History task", exact: true });
  await task.check();
  await expect(task).toBeChecked();
  await page
    .getByRole("button", { name: "Pomodoro · History task", exact: true })
    .click();
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(60_100);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Kế hoạch", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(task).not.toBeChecked();
  await expect
    .poll(() => savedHistory(page))
    .toMatchObject([
      {
        outcome: "completed",
        focusedDurationMs: 60_000,
        task: { id: "task-history" },
      },
    ]);
  const originalId = (await savedHistory(page))[0].id;
  await page.reload();
  await expect(task).not.toBeChecked();
  await openTimer(page);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  expect((await savedHistory(page)).map((session) => session.id)).toEqual([
    originalId,
  ]);
});

test("imports a history-only backup repeatedly while retaining tasks and prior history", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-11T05:00:00Z"));
  const first: PomodoroSession = {
    id: "session-history-first",
    startedAt: 1_791_691_000_000,
    endedAt: 1_791_691_060_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 60_000,
    outcome: "completed",
    task: {
      id: "task-history",
      name: "Original task snapshot",
      projectName: "History project",
    },
  };
  const second: PomodoroSession = {
    id: "session-history-second",
    startedAt: 1_791_692_000_000,
    endedAt: 1_791_692_010_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 10_000,
    outcome: "stopped",
  };
  await page.goto("/app");
  await importBackup(page, { ...seed, pomodoroSessions: [first] });
  const historyOnly: Plan = {
    version: 1,
    weeks: [],
    pomodoroSessions: [second],
  };
  await importBackup(page, historyOnly);
  await importBackup(page, historyOnly);
  await expect(
    page
      .getByTestId("day-work")
      .getByRole("checkbox", { name: "History task", exact: true }),
  ).toBeVisible();
  await expect.poll(() => savedHistory(page)).toEqual([first, second]);
  await openTimer(page);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Cài đặt", exact: true })
    .filter({ visible: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
  const path = await (await downloaded).path();
  if (!path) throw new Error("Backup download missing");
  const exported = JSON.parse(await readFile(path, "utf8")) as Plan;
  expect(exported.version).toBe(1);
  expect(exported.pomodoroSessions).toEqual([first, second]);
  expect(exported.weeks[0].projects[0].tasks[0].name).toBe("History task");
  await page
    .getByRole("dialog", { name: "Cài đặt", exact: true })
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.reload();
  await openTimer(page);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(2);
  expect(await savedHistory(page)).toEqual([first, second]);
});

test("summarizes actual focus and completed counts by the ending day in Saigon", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-11T05:00:00Z"));
  const session = (
    id: string,
    start: string,
    end: string,
    minutes: number,
    outcome: PomodoroSession["outcome"] = "completed",
  ): PomodoroSession => ({
    id,
    startedAt: Date.parse(start),
    endedAt: Date.parse(end),
    plannedDurationMs: (outcome === "stopped" ? 25 : minutes) * 60_000,
    focusedDurationMs: minutes * 60_000,
    outcome,
  });
  await page.goto("/app");
  await importBackup(page, {
    version: 1,
    weeks: [],
    pomodoroSessions: [
      session(
        "today-completed",
        "2026-10-11T03:35:00Z",
        "2026-10-11T04:00:00Z",
        25,
      ),
      session(
        "today-stopped",
        "2026-10-11T04:40:00Z",
        "2026-10-11T05:00:00Z",
        10,
        "stopped",
      ),
      session(
        "ending-after-midnight",
        "2026-10-10T16:00:00Z",
        "2026-10-10T17:01:00Z",
        25,
      ),
      session(
        "first-day-in-window",
        "2026-10-04T17:00:00Z",
        "2026-10-04T17:01:00Z",
        1,
      ),
      session(
        "before-window",
        "2026-10-04T16:58:00Z",
        "2026-10-04T16:59:00Z",
        1,
      ),
      session("future-day", "2026-10-11T17:00:00Z", "2026-10-11T17:01:00Z", 1),
    ],
  });
  await openTimer(page);
  const summaries = page.locator(".pomodoro-summary > div");
  await expect(
    summaries.filter({ hasText: "Tập trung hôm nay" }).locator("strong"),
  ).toHaveText("60phút");
  await expect(
    summaries.filter({ hasText: "Phiên hoàn tất hôm nay" }).locator("strong"),
  ).toHaveText("2phiên");
  await expect(
    summaries.filter({ hasText: "Tập trung 7 ngày qua" }).locator("strong"),
  ).toHaveText("61phút");
  await expect(
    summaries
      .filter({ hasText: "Phiên hoàn tất 7 ngày qua" })
      .locator("strong"),
  ).toHaveText("3phiên");
});

test("keeps planner Undo shortcuts out of Pomodoro", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-11T05:00:00Z"));
  await page.goto("/app");
  await importBackup(page, seed);
  const task = page
    .getByTestId("day-work")
    .getByRole("checkbox", { name: "History task", exact: true });
  await task.check();
  await expect(task).toBeChecked();
  await openTimer(page);
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).focus();
  await page.keyboard.press("ControlOrMeta+z");
  await page
    .getByRole("button", { name: "Kế hoạch", exact: true })
    .filter({ visible: true })
    .click();
  await expect(task).toBeChecked();
});
