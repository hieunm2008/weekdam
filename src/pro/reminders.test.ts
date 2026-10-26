import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { Plan } from "../domain";
import {
  defaultReminderSettings,
  deadlineTimestamp,
  listDeadlineReminders,
  scanDeadlineReminders,
  readReminderInbox,
  dismissReminder,
} from "./reminders";

const settings = {
  enabled: true,
  offsetsMinutes: [4320, 1440, 120],
  browserNotifications: false,
};
function fixture(): Plan {
  return {
    version: 1,
    weeks: [
      {
        id: "w",
        start: "2026-10-19",
        ended: false,
        projects: [
          {
            id: "p",
            name: "Toán",
            deadline: "2026-10-25",
            tasks: [
              {
                id: "t",
                name: "Bài tập",
                deadline: "2026-10-25",
                note: "",
                done: false,
                subtasks: [
                  {
                    id: "s",
                    day: 4,
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
}
const now = Date.parse("2026-10-25T22:00:00+07:00");

describe("deadline reminders", () => {
  it("interprets date-only and datetime deadlines in Vietnam", () => {
    expect(deadlineTimestamp("2026-10-25")).toBe(
      Date.parse("2026-10-25T23:59:00+07:00"),
    );
    expect(deadlineTimestamp("2026-10-25T09:30")).toBe(
      Date.parse("2026-10-25T09:30:00+07:00"),
    );
    expect(deadlineTimestamp("2026-02-30")).toBeUndefined();
    expect(deadlineTimestamp("2026-10-25T24:00")).toBeUndefined();
  });
  it("produces each crossed milestone once per entity and omits future milestones", () => {
    const result = listDeadlineReminders(fixture(), settings, now);
    expect(result).toHaveLength(6);
    expect(result.filter((item) => item.kind === "project")).toHaveLength(3);
    expect(result.filter((item) => item.kind === "task")).toHaveLength(3);
    expect(
      listDeadlineReminders(
        fixture(),
        { ...settings, offsetsMinutes: [120, 120] },
        now,
      ),
    ).toHaveLength(2);
    expect(
      listDeadlineReminders(
        fixture(),
        settings,
        Date.parse("2026-10-22T23:58:00+07:00"),
      ),
    ).toHaveLength(0);
  });
  it("skips completed tasks/projects and disabled reminders", () => {
    const plan = fixture();
    plan.weeks[0].projects[0].tasks[0].subtasks[0].done = true;
    expect(listDeadlineReminders(plan, settings, now)).toEqual([]);
    expect(
      listDeadlineReminders(fixture(), defaultReminderSettings(), now),
    ).toEqual([]);
  });
  it("invalidates reminder identities when a deadline changes", () => {
    const before = listDeadlineReminders(fixture(), settings, now).map(
      (item) => item.key,
    );
    const plan = fixture();
    plan.weeks[0].projects[0].tasks[0].deadline = "2026-10-26";
    const next = listDeadlineReminders(plan, settings, now).filter(
      (item) => item.kind === "task",
    );
    // The one-day milestone is still 1h59m in the future after this edit.
    expect(next).toHaveLength(1);
    expect(next.every((item) => !before.includes(item.key))).toBe(true);
  });
  it("atomically claims concurrent scans across tabs and restores a grouped durable inbox", async () => {
    const scope = "atomic-tabs";
    const results = await Promise.all([
      scanDeadlineReminders(scope, fixture(), settings, now, true),
      scanDeadlineReminders(scope, fixture(), settings, now, true),
    ]);
    expect(
      results.reduce((count, result) => count + result.newItems.length, 0),
    ).toBe(2);
    const restored = await readReminderInbox(scope);
    expect(restored).toHaveLength(2);
    expect(restored[0].offsetsMinutes).toEqual([4320, 1440, 120]);
    expect(restored.every((item) => item.missed)).toBe(true);
    const again = await scanDeadlineReminders(
      scope,
      fixture(),
      settings,
      now + 30000,
      false,
    );
    expect(again.newItems).toEqual([]);
    expect(again.items).toHaveLength(2);
  });
  it("keeps dismissed reminders dismissed and isolates accounts", async () => {
    const result = await scanDeadlineReminders(
      "dismiss-account",
      fixture(),
      settings,
      now,
      true,
    );
    await dismissReminder("dismiss-account", result.items[0].id);
    expect(
      (
        await scanDeadlineReminders(
          "dismiss-account",
          fixture(),
          settings,
          now,
          false,
        )
      ).items,
    ).toHaveLength(1);
    expect(await readReminderInbox("another-account")).toEqual([]);
  });
  it("removes stale, deleted and completed inbox entries on the next scan", async () => {
    await scanDeadlineReminders(
      "stale-account",
      fixture(),
      settings,
      now,
      true,
    );
    const changed = fixture();
    changed.weeks[0].projects[0].deadline = "2026-11-25";
    changed.weeks[0].projects[0].tasks = [];
    const result = await scanDeadlineReminders(
      "stale-account",
      changed,
      settings,
      now,
      false,
    );
    expect(result.items).toEqual([]);
  });
  it("marks newly crossed reminders live but groups long-missed milestones", async () => {
    const at = Date.parse("2026-10-22T23:59:00+07:00");
    const live = await scanDeadlineReminders(
      "live-account",
      fixture(),
      settings,
      at,
      false,
    );
    expect(live.newItems).toHaveLength(2);
    expect(live.newItems.every((item) => !item.missed)).toBe(true);
    const reopened = await scanDeadlineReminders(
      "live-account",
      fixture(),
      settings,
      now,
      true,
    );
    expect(reopened.newItems).toHaveLength(2);
    expect(
      reopened.newItems.every(
        (item) => item.missed && item.offsetsMinutes.length === 3,
      ),
    ).toBe(true);
  });
});
