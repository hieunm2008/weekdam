import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  copyProjects,
  endWeek,
  mergePlans,
  parseBackup,
  type Plan,
} from "./domain";
import { decodeRecords, diffRecords, encodeRecords } from "./records";
import { loadAccount, saveAccount } from "./storage";

const fixture = (): Plan => ({
  version: 1,
  weeks: [
    {
      id: "week_2026-10-19",
      start: "2026-10-19",
      ended: false,
      projects: [
        {
          id: "p",
          name: "Math",
          tasks: [
            {
              id: "t",
              name: "Review",
              note: "",
              done: false,
              source: {
                kind: "recurrence",
                operationId: "op",
                seriesId: "r",
                occurrenceDate: "2026-10-20",
              },
              subtasks: [
                {
                  id: "s",
                  day: 1,
                  weight: 1,
                  note: "",
                  done: false,
                  missed: [],
                  startTime: "09:00",
                  endTime: "09:50",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  pro: {
    templates: [
      {
        id: "tpl",
        name: "Study",
        sourceWeek: "2026-10-19",
        projects: [{ id: "tp", name: "English", tasks: [] }],
      },
    ],
    recurrenceRules: [
      {
        id: "r",
        operationId: "op",
        name: "Review",
        note: "",
        weight: 1,
        days: [1],
        startTime: "09:00",
        endTime: "09:50",
        startDate: "2026-10-19",
        endDate: "2027-01-10",
      },
    ],
    appliedOperations: ["op"],
    reminders: {
      enabled: true,
      offsetsMinutes: [4320, 1440, 120],
      browserNotifications: false,
    },
  },
});

it("keeps optional Pro content through backup and sync records", () => {
  const plan = fixture();
  expect(parseBackup(JSON.stringify(plan))).toEqual(plan);
  expect(decodeRecords(encodeRecords(plan))).toEqual(plan);
  expect(parseBackup('{"version":1,"weeks":[]}')).toEqual({
    version: 1,
    weeks: [],
  });
});
it("preserves Pro records in the account outbox and tombstones deleted templates", async () => {
  const plan = fixture(),
    records = diffRecords({ version: 1, weeks: [] }, plan);
  await saveAccount(
    "pro-test",
    plan,
    records.map((record) => ({ record, revision: record.id })),
    true,
  );
  const saved = await loadAccount("pro-test");
  expect(saved.plan).toEqual(plan);
  expect(decodeRecords(saved.pending.map((p) => p.record))).toEqual(plan);
  const next = structuredClone(plan);
  next.pro!.templates = [];
  expect(diffRecords(plan, next).find((r) => r.id === "tpl")?.deleted).toBe(
    true,
  );
});
it("copies generated work independently and never carries recurrence occurrences", () => {
  const plan = fixture();
  expect(
    copyProjects(plan.weeks[0].projects, false)[0].tasks[0].source,
  ).toBeUndefined();
  const ended = endWeek(plan, "2026-10-19", true);
  expect(
    ended.weeks.find((w) => w.start === "2026-10-26")?.projects ?? [],
  ).toEqual([]);
});
it("merges Pro content without losing an operation ledger or local reminder settings", () => {
  const incoming = fixture(),
    local: Plan = {
      version: 1,
      weeks: [],
      pro: {
        appliedOperations: ["other"],
        reminders: {
          enabled: false,
          offsetsMinutes: [120],
          browserNotifications: false,
        },
      },
    };
  const merged = mergePlans(local, incoming);
  expect(merged.pro?.templates).toEqual(incoming.pro?.templates);
  expect(merged.pro?.recurrenceRules).toEqual(incoming.pro?.recurrenceRules);
  expect(merged.pro?.appliedOperations).toEqual(["other", "op"]);
  expect(merged.pro?.reminders?.enabled).toBe(false);
});
it.each([
  {
    templates: [
      { id: "bad", name: "", sourceWeek: "2026-10-19", projects: [] },
    ],
  },
  {
    recurrenceRules: [
      {
        id: "bad",
        operationId: "op",
        name: "X",
        note: "",
        weight: 1,
        days: [7],
        startTime: "23:00",
        endTime: "01:00",
        startDate: "2026-10-19",
        endDate: "2027-01-10",
      },
    ],
  },
  {
    reminders: {
      enabled: true,
      offsetsMinutes: [-1],
      browserNotifications: false,
    },
  },
  { appliedOperations: ["op", "op"] },
])("rejects malformed Pro content", (pro) =>
  expect(() =>
    parseBackup(JSON.stringify({ version: 1, weeks: [], pro })),
  ).toThrow(),
);
it("does not import billing into a planner backup", () => {
  const parsed = parseBackup(
    JSON.stringify({
      version: 1,
      weeks: [],
      demoBilling: { expiresAt: 9999999999999 },
      demoReceipts: [],
    }),
  );
  expect(parsed).toEqual({ version: 1, weeks: [] });
});
