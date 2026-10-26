import { describe, expect, it } from "vitest";
import {
  copyProjects,
  endWeek,
  mergePlans,
  moveWeek,
  parseBackup,
  type Plan,
} from "./domain";
import {
  decodeRecords,
  diffRecords,
  encodeRecords,
  normalizeForSync,
  type CloudRecord,
} from "./records";
import {
  applyExam,
  applyRecurrence,
  editOccurrence,
  previewExam,
  previewRecurrence,
} from "./pro/planning";

const empty = (): Plan => ({ version: 1, weeks: [] });
const now = new Date("2027-01-03T00:00:00Z");
const tasks = (plan: Plan) =>
  plan.weeks.flatMap((week) =>
    week.projects.flatMap((project) => project.tasks),
  );
const remoteAfter = (before: Plan, changes: CloudRecord[]): Plan => {
  const documents = new Map(
    encodeRecords(before).map((record) => [record.id, record]),
  );
  for (const change of changes) documents.set(change.id, change);
  return parseBackup(JSON.stringify(decodeRecords([...documents.values()])));
};
const recurrence = () =>
  previewRecurrence(
    empty(),
    {
      name: "IELTS",
      note: "",
      weight: 1,
      days: [0, 2],
      startTime: "19:00",
      endTime: "19:50",
      startDate: "2027-01-04",
      endDate: "2027-01-17",
    },
    now,
  );

describe("Pro data integration invariants", () => {
  it("does not overwrite a legacy task whose ID matches the reminder record ID", () => {
    const legacy = parseBackup(
      JSON.stringify({
        version: 1,
        weeks: [
          {
            id: "w",
            start: "2027-01-04",
            ended: false,
            projects: [
              {
                id: "p",
                name: "Legacy",
                tasks: [
                  {
                    id: "pro-reminders",
                    name: "Keep my task",
                    note: "",
                    done: false,
                    subtasks: [],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const next = normalizeForSync({
      ...legacy,
      pro: {
        reminders: {
          enabled: true,
          offsetsMinutes: [120],
          browserNotifications: false,
        },
      },
    });
    expect(
      tasks(remoteAfter(empty(), diffRecords(empty(), next))).map(
        (task) => task.name,
      ),
    ).toEqual(["Keep my task"]);
  });

  it("remaps an incoming project ID that conflicts with a local personal template", () => {
    const local: Plan = {
      version: 1,
      weeks: [],
      pro: {
        templates: [
          {
            id: "p",
            name: "My template",
            sourceWeek: "2027-01-04",
            projects: [],
          },
        ],
      },
    };
    const incoming: Plan = {
      version: 1,
      weeks: [
        {
          id: "w",
          start: "2027-01-04",
          ended: false,
          projects: [{ id: "p", name: "Incoming project", tasks: [] }],
        },
      ],
    };
    const merged = mergePlans(local, incoming);
    expect(() => parseBackup(JSON.stringify(merged))).not.toThrow();
    expect(merged.weeks[0].projects[0].name).toBe("Incoming project");
    expect(merged.pro?.templates?.[0].name).toBe("My template");
  });

  it("keeps synthetic IDs within the cloud limit while retaining the complete operation ID", () => {
    const operationId = "a".repeat(200);
    const plan = parseBackup(
      JSON.stringify({
        version: 1,
        weeks: [],
        pro: { appliedOperations: [operationId] },
      }),
    );
    expect(encodeRecords(plan).every((record) => record.id.length <= 200)).toBe(
      true,
    );
    expect(decodeRecords(encodeRecords(plan)).pro?.appliedOperations).toEqual([
      operationId,
    ]);
  });

  it("remaps an incoming personal template ID that conflicts with an existing project", () => {
    const local: Plan = {
      version: 1,
      weeks: [
        {
          id: "w",
          start: "2027-01-04",
          ended: false,
          projects: [{ id: "p", name: "Existing project", tasks: [] }],
        },
      ],
    };
    const incoming: Plan = {
      version: 1,
      weeks: [],
      pro: {
        templates: [
          {
            id: "p",
            name: "Incoming template",
            sourceWeek: "2027-01-04",
            projects: [],
          },
        ],
      },
    };
    const merged = mergePlans(local, incoming);
    expect(() => parseBackup(JSON.stringify(merged))).not.toThrow();
    expect(merged.pro?.templates?.[0].name).toBe("Incoming template");
  });

  it("rewrites only imported series links when a conflicting rule receives a new ID", () => {
    const incoming = applyRecurrence(empty(), recurrence(), false, now);
    const incomingRule = incoming.pro!.recurrenceRules![0];
    const local: Plan = {
      version: 1,
      weeks: [],
      pro: { recurrenceRules: [{ ...incomingRule, name: "Local rule" }] },
    };
    const merged = mergePlans(local, incoming),
      importedRule = merged.pro!.recurrenceRules!.find(
        (rule) => rule.name === "IELTS",
      )!;
    expect(importedRule.id).not.toBe(incomingRule.id);
    expect(
      tasks(merged).every(
        (task) =>
          task.source?.seriesId === importedRule.id &&
          task.subtasks.every(
            (step) => step.source?.seriesId === importedRule.id,
          ),
      ),
    ).toBe(true);
    expect(merged.pro!.recurrenceRules![0]).toEqual(
      local.pro!.recurrenceRules![0],
    );
    expect(() => parseBackup(JSON.stringify(merged))).not.toThrow();
  });

  it("keeps imported recurrence links when a conflicting project must receive new IDs", () => {
    const incoming = applyRecurrence(empty(), recurrence(), false, now);
    const local = structuredClone(incoming);
    local.weeks[0].projects[0].tasks[0].name = "A local exception";
    const merged = mergePlans(local, incoming);
    const imported = merged.weeks[0].projects[1].tasks;
    expect(imported[0].id).not.toBe(tasks(incoming)[0].id);
    expect(imported[0].source).toMatchObject({
      kind: "recurrence",
      seriesId: incoming.pro!.recurrenceRules![0].id,
      occurrenceDate: "2027-01-04",
    });
    const edited = editOccurrence(
      merged,
      imported[0].id,
      { name: "Updated imported occurrence" },
      "single",
      now,
    );
    expect(edited.weeks[0].projects[1].tasks[0].name).toBe(
      "Updated imported occurrence",
    );
    expect(edited.weeks[0].projects[0].tasks[0].name).toBe("A local exception");
    expect(() => parseBackup(JSON.stringify(edited))).not.toThrow();
  });

  it("migrates a legacy task ID that conflicts with a canonical week without losing its history link", () => {
    const plan = applyRecurrence(empty(), recurrence(), false, now);
    plan.weeks[0].id = "legacy-week";
    plan.weeks[0].projects[0].tasks[0].id = "week_2027-01-04";
    plan.pomodoroSessions = [
      {
        id: "focus",
        startedAt: 1_000,
        endedAt: 61_000,
        plannedDurationMs: 60_000,
        focusedDurationMs: 60_000,
        outcome: "completed",
        task: { id: "week_2027-01-04", name: "IELTS", projectName: "IELTS" },
      },
    ];
    expect(() => parseBackup(JSON.stringify(plan))).not.toThrow();
    const normalized = normalizeForSync(plan);
    expect(tasks(normalized)[0].id).not.toBe("week_2027-01-04");
    expect(normalized.pomodoroSessions![0].task!.id).toBe(
      tasks(normalized)[0].id,
    );
    expect(
      tasks(remoteAfter(empty(), diffRecords(empty(), normalized))),
    ).toHaveLength(4);
    expect(normalizeForSync(plan)).toEqual(normalized);
    expect(normalizeForSync(normalized)).toEqual(normalized);
    expect(plan.weeks[0].id).toBe("legacy-week");
    expect(tasks(plan)).toHaveLength(4);
  });

  it("migrates a colliding recurrence-rule ID and retains every series reference", () => {
    const plan = applyRecurrence(empty(), recurrence(), false, now);
    const oldId = plan.pro!.recurrenceRules![0].id;
    plan.weeks[0].id = "legacy-week";
    plan.pro!.recurrenceRules![0].id = "week_2027-01-04";
    for (const task of tasks(plan)) {
      task.source!.seriesId = "week_2027-01-04";
      task.subtasks[0].source!.seriesId = "week_2027-01-04";
    }
    expect(oldId).not.toBe("week_2027-01-04");
    expect(() => parseBackup(JSON.stringify(plan))).not.toThrow();
    const normalized = normalizeForSync(plan);
    const ruleId = normalized.pro!.recurrenceRules![0].id;
    expect(ruleId).not.toBe("week_2027-01-04");
    expect(
      tasks(normalized).every(
        (task) =>
          task.source?.seriesId === ruleId &&
          task.subtasks[0].source?.seriesId === ruleId,
      ),
    ).toBe(true);
    expect(
      parseBackup(
        JSON.stringify(remoteAfter(empty(), diffRecords(empty(), normalized))),
      ),
    ).toEqual(normalized);
  });

  it("keeps a deleted occurrence absent after cloud tombstones, reload, and retry", () => {
    const preview = recurrence(),
      original = applyRecurrence(empty(), preview),
      removed = editOccurrence(
        original,
        tasks(original)[1].id,
        null,
        "single",
        now,
      );
    const otherDevice = remoteAfter(original, diffRecords(original, removed));
    expect(
      tasks(otherDevice).map((task) => task.source?.occurrenceDate),
    ).toEqual(["2027-01-04", "2027-01-11", "2027-01-13"]);
    expect(tasks(applyRecurrence(otherDevice, preview))).toHaveLength(3);
  });

  it("rejects a single-occurrence edit when its week ended after the editor opened", () => {
    const plan = applyRecurrence(empty(), recurrence(), false, now);
    plan.weeks[0].ended = true;
    const before = structuredClone(plan);
    expect(() =>
      editOccurrence(
        plan,
        tasks(plan)[0].id,
        { name: "Stale edit" },
        "single",
        now,
      ),
    ).toThrow("destination-ended");
    expect(() =>
      editOccurrence(plan, tasks(plan)[0].id, null, "single", now),
    ).toThrow("destination-ended");
    expect(plan).toEqual(before);
  });

  it.each(["task", "subtask", "rule", "template", "reminders"])(
    "rejects unsupported fields in imported Pro %s metadata before an outbox is created",
    (kind) => {
      const plan = applyRecurrence(empty(), recurrence(), false, now);
      let target: object;
      if (kind === "task") target = tasks(plan)[0].source!;
      else if (kind === "subtask") target = tasks(plan)[0].subtasks[0].source!;
      else if (kind === "rule") target = plan.pro!.recurrenceRules![0];
      else if (kind === "template") {
        plan.pro!.templates = [
          {
            id: "template",
            name: "Own",
            sourceWeek: "2027-01-04",
            projects: [],
          },
        ];
        target = plan.pro!.templates[0];
      } else {
        plan.pro!.reminders = {
          enabled: true,
          offsetsMinutes: [120],
          browserNotifications: false,
        };
        target = plan.pro!.reminders;
      }
      Object.assign(target, { unsupported: "would be rejected by Firestore" });
      expect(() => parseBackup(JSON.stringify(plan))).toThrow();
    },
  );

  it("undoes every generated record and operation marker together, allowing a clean retry", () => {
    const preview = recurrence(),
      original = empty(),
      applied = applyRecurrence(original, preview);
    const restored = remoteAfter(applied, diffRecords(applied, original));
    expect(restored).toEqual(original);
    expect(tasks(applyRecurrence(restored, preview))).toHaveLength(4);
  });

  it("never carries recurring sessions and strips all source links from ordinary copies", () => {
    const recurring = applyRecurrence(empty(), recurrence());
    const copied = copyProjects(recurring.weeks[0].projects, false);
    expect(
      copied
        .flatMap((project) => project.tasks)
        .every(
          (task) => !task.source && task.subtasks.every((step) => !step.source),
        ),
    ).toBe(true);
    const ended = endWeek(recurring, "2027-01-04", true);
    expect(
      tasks(ended).filter(
        (task) => task.source?.occurrenceDate === "2027-01-04",
      ),
    ).toHaveLength(1);
    expect(ended.weeks[1].projects[0].tasks).toHaveLength(2);
  });

  it("carries an unfinished exam session as independent content", () => {
    const preview = previewExam(
      empty(),
      {
        subject: "Math",
        startDate: "2027-01-04",
        examDate: "2027-01-08",
        topics: [{ name: "Integrals", minutes: 50 }],
        availability: [{ day: 0, startTime: "19:00", endTime: "20:00" }],
      },
      now,
    );
    const carried = endWeek(applyExam(empty(), preview), "2027-01-04", true);
    const task = carried.weeks[1].projects[0].tasks[0];
    expect(task.name).toBe("Integrals");
    expect(task.source).toBeUndefined();
    expect(task.subtasks[0].source).toBeUndefined();
  });

  it("detaches and shifts recurrence provenance when a whole week is moved", () => {
    const original = applyRecurrence(empty(), recurrence(), false, now);
    const moved = moveWeek(original, "2027-01-04", "2027-02-01");
    const relocated = moved.weeks.find((week) => week.start === "2027-02-01")!
      .projects[0].tasks[0];
    expect(relocated.source).toMatchObject({
      detached: true,
      occurrenceDate: "2027-02-01",
    });
    expect(relocated.subtasks[0].source).toMatchObject({
      detached: true,
      occurrenceDate: "2027-02-01",
    });
    const future = editOccurrence(
      moved,
      tasks(moved)[0].id,
      { name: "Changed future" },
      "future",
      now,
    );
    expect(
      future.weeks.find((week) => week.start === "2027-02-01")!.projects[0]
        .tasks[0].name,
    ).toBe("IELTS");
  });
});
