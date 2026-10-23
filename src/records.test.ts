import { expect, it } from "vitest";
import type { Plan } from "./domain";
import {
  encodeRecords,
  decodeRecords,
  normalizeForSync,
  diffRecords,
} from "./records";

it("round-trips completed and stopped focus history independently of task records", () => {
  const completed = {
    id: "pomodoro_complete",
    startedAt: 1_000,
    endedAt: 61_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 60_000,
    outcome: "completed" as const,
    task: { id: "deleted-task", name: "Study", projectName: "Math" },
  };
  const stopped = {
    ...completed,
    id: "pomodoro_stop",
    endedAt: 121_000,
    focusedDurationMs: 20_000,
    outcome: "stopped" as const,
  };
  const plan = {
    version: 1 as const,
    weeks: [],
    pomodoroSessions: [completed, stopped],
  };
  const records = encodeRecords(plan);
  expect(records).toEqual([
    {
      id: "pomodoro_complete",
      kind: "pomodoroSession",
      parent: "",
      order: 0,
      deleted: false,
      value: completed,
    },
    {
      id: "pomodoro_stop",
      kind: "pomodoroSession",
      parent: "",
      order: 0,
      deleted: false,
      value: stopped,
    },
  ]);
  expect(decodeRecords(records)).toEqual(plan);
  expect(
    diffRecords({ version: 1, weeks: [] }, plan).map((record) => record.id),
  ).toEqual(["pomodoro_complete", "pomodoro_stop"]);
});

it("rejects a history ID that would overwrite a canonicalized week record", () => {
  const plan = {
    version: 1 as const,
    weeks: [
      { id: "legacy-week", start: "2026-10-05", ended: false, projects: [] },
    ],
    pomodoroSessions: [
      {
        id: "week_2026-10-05",
        startedAt: 1_000,
        endedAt: 61_000,
        plannedDurationMs: 60_000,
        focusedDurationMs: 60_000,
        outcome: "completed" as const,
      },
    ],
  };
  expect(() => normalizeForSync(plan)).toThrow("invalid-id");
  expect(plan.weeks[0].id).toBe("legacy-week");
});
it("preserves independent subtask edits in records and hides descendants of deleted parents", () => {
  const plan = {
    version: 1 as const,
    weeks: [
      {
        id: "w",
        start: "2026-10-05",
        ended: false,
        projects: [
          {
            id: "p",
            name: "Project",
            tasks: [
              {
                id: "t",
                name: "Task",
                note: "",
                done: false,
                subtasks: [
                  {
                    id: "s",
                    day: 3,
                    weight: 2 as const,
                    note: "note",
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
  const records = encodeRecords(plan);
  expect(records).toHaveLength(4);
  expect(decodeRecords(records)).toEqual(plan);
  const edited = records.map((r) =>
    r.id === "s" ? { ...r, value: { ...r.value, done: true } } : r,
  );
  expect(
    decodeRecords(edited).weeks[0].projects[0].tasks[0].subtasks[0].done,
  ).toBe(true);
  expect(
    decodeRecords(
      records.map((r) => (r.id === "p" ? { ...r, deleted: true } : r)),
    ).weeks[0].projects,
  ).toHaveLength(0);
});
it("canonicalizes week identities and emits only changed or deleted entities", () => {
  const original = {
    version: 1 as const,
    weeks: [
      {
        id: "imported-week",
        start: "2026-10-05",
        ended: false,
        projects: [{ id: "p", name: "Project", tasks: [] }],
      },
    ],
  };
  const normalized = normalizeForSync(original);
  expect(normalized.weeks[0].id).toBe("week_2026-10-05");
  expect(normalized.weeks[0].projects[0].id).toBe("p");
  const changed = structuredClone(normalized);
  changed.weeks[0].projects[0].name = "Changed";
  expect(diffRecords(normalized, changed).map((r) => r.id)).toEqual(["p"]);
  const removed = structuredClone(normalized);
  removed.weeks[0].projects = [];
  expect(diffRecords(normalized, removed)).toEqual([
    {
      id: "p",
      kind: "project",
      parent: "week_2026-10-05",
      order: 0,
      deleted: true,
      value: { id: "p" },
    },
  ]);
});
it("round-trips a day rank and emits only its subtask for a rank-only change", () => {
  const original: Plan = {
    version: 1,
    weeks: [
      {
        id: "week_2026-10-05",
        start: "2026-10-05",
        ended: false,
        projects: [
          {
            id: "project",
            name: "Project",
            tasks: [
              {
                id: "task",
                name: "Task",
                note: "",
                done: false,
                subtasks: [
                  {
                    id: "step",
                    day: 0,
                    weight: 1,
                    note: "",
                    done: false,
                    missed: [],
                    dayOrder: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(decodeRecords(encodeRecords(original))).toEqual(original);
  const changed = structuredClone(original);
  changed.weeks[0].projects[0].tasks[0].subtasks[0].dayOrder = 1_000_000_000;
  expect(diffRecords(original, changed)).toEqual([
    {
      id: "step",
      kind: "subtask",
      parent: "task",
      order: 0,
      deleted: false,
      value: {
        id: "step",
        day: 0,
        weight: 1,
        note: "",
        done: false,
        missed: [],
        dayOrder: 1_000_000_000,
      },
    },
  ]);
  expect(decodeRecords(encodeRecords(changed))).toEqual(changed);
});

it("round-trips timed sessions and emits only their records when rescheduled or cleared", () => {
  const original: Plan = {
    version: 1,
    weeks: [
      {
        id: "week_2026-10-05",
        start: "2026-10-05",
        ended: false,
        projects: [
          {
            id: "project",
            name: "Project",
            tasks: [
              {
                id: "task",
                name: "Task",
                note: "",
                done: false,
                subtasks: [
                  {
                    id: "session",
                    day: 0,
                    weight: 2,
                    note: "",
                    done: false,
                    missed: [],
                    startTime: "09:00",
                    endTime: "10:00",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(decodeRecords(encodeRecords(original))).toEqual(original);
  const changed = structuredClone(original);
  const session = changed.weeks[0].projects[0].tasks[0].subtasks[0];
  session.startTime = "13:00";
  session.endTime = "14:00";
  const patch = diffRecords(original, changed);
  expect(patch.map((record) => record.id)).toEqual(["session"]);
  expect(patch[0].value).toMatchObject({
    startTime: "13:00",
    endTime: "14:00",
  });
  const beforeClear = structuredClone(changed);
  delete session.startTime;
  delete session.endTime;
  const cleared = diffRecords(beforeClear, changed);
  expect(cleared.map((record) => record.id)).toEqual(["session"]);
  expect(cleared[0].value).not.toHaveProperty("startTime");
  expect(cleared[0].value).not.toHaveProperty("endTime");
  expect(
    decodeRecords(encodeRecords(changed)).weeks[0].projects[0].tasks[0]
      .subtasks[0],
  ).not.toHaveProperty("startTime");
});
