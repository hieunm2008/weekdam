import { describe, expect, it } from "vitest";
import * as domain from "./domain";

describe("calendar in the planning timezone", () => {
  it("gives two devices the same identity for a newly created week", () => {
    expect(domain.weekAt({ version: 1, weeks: [] }, "2026-10-05").id).toBe(
      domain.weekAt({ version: 1, weeks: [] }, "2026-10-05").id,
    );
  });
  it("keeps local Monday across a UTC Sunday boundary", () => {
    expect(domain.today(new Date("2026-10-11T18:30:00Z"))).toBe("2026-10-12");
    expect(domain.weekStart("2027-01-01")).toBe("2026-12-28");
    expect(domain.shiftDate("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("includes today in days remaining, with past/future boundaries", () => {
    expect(domain.daysLeft("2026-10-05", "2026-10-08")).toBe(4);
    expect(domain.daysLeft("2026-10-05", "2026-10-11")).toBe(1);
    expect(domain.daysLeft("2026-10-05", "2026-10-12")).toBe(0);
    expect(domain.daysLeft("2026-10-12", "2026-10-08")).toBe(7);
  });
});

describe("planner operations", () => {
  const fixture = () => ({
    version: 1 as const,
    weeks: [
      {
        id: "w1",
        start: "2026-10-05",
        ended: false,
        projects: [
          {
            id: "p1",
            name: "Math",
            tasks: [
              {
                id: "t1",
                name: "Study",
                note: "note",
                deadline: "2026-10-11",
                done: false,
                subtasks: [
                  {
                    id: "s1",
                    day: 0,
                    weight: 1 as const,
                    note: "easy",
                    done: true,
                    missed: [],
                  },
                  {
                    id: "s2",
                    day: 3,
                    weight: 2 as const,
                    note: "medium",
                    done: false,
                    missed: [1],
                  },
                  {
                    id: "s3",
                    day: 3,
                    weight: 3 as const,
                    note: "hard",
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
  });
  it("uses difficulty units, including tasks without subtasks", () => {
    expect(domain.progress(fixture().weeks[0].projects)).toEqual({
      done: 1,
      total: 6,
      percent: 17,
    });
    const f = fixture();
    f.weeks[0].projects[0].tasks.push({
      id: "t2",
      name: "Standalone",
      note: "",
      deadline: "",
      done: true,
      subtasks: [],
    });
    expect(domain.progress(f.weeks[0].projects)).toEqual({
      done: 2,
      total: 7,
      percent: 29,
    });
  });
  it("copies selected projects as new IDs and resets progression by default", () => {
    const copied = domain.copyProjects(fixture().weeks[0].projects, false);
    expect(copied[0].id).not.toBe("p1");
    expect(
      copied[0].tasks[0].subtasks.every((s) => !s.done && !s.missed.length),
    ).toBe(true);
    expect(copied[0].tasks[0].deadline).toBe("2026-10-11");
    expect(
      domain.copyProjects(fixture().weeks[0].projects, true)[0].tasks[0]
        .subtasks[0].done,
    ).toBe(true);
  });
  it("moves only the pending part when ending and appends to an existing destination", () => {
    const f = fixture();
    f.weeks.push({ id: "w2", start: "2026-10-12", ended: false, projects: [] });
    const ended = domain.endWeek(f, "2026-10-05", true);
    expect(ended.weeks[0].ended).toBe(true);
    expect(ended.weeks[0].projects[0].tasks[0].subtasks).toHaveLength(3);
    const pending = ended.weeks[1].projects[0].tasks[0].subtasks;
    expect(pending.map((s) => s.note)).toEqual(["medium", "hard"]);
    expect(pending.every((s) => !s.done && !s.missed.length)).toBe(true);
    expect(f.weeks[0].ended).toBe(false);
    expect(
      domain.endWeek(f, "2026-10-05", false).weeks[1].projects,
    ).toHaveLength(0);
  });
  it("rejects whole-week moves into occupied destinations and preserves IDs on valid moves", () => {
    const f = fixture();
    expect(domain.moveWeek(f, "2026-10-05", "2026-10-12").weeks[0].start).toBe(
      "2026-10-12",
    );
    expect(
      domain.moveWeek(f, "2026-10-05", "2026-10-12").weeks[0].projects[0].id,
    ).toBe("p1");
    f.weeks.push({ ...f.weeks[0], id: "w2", start: "2026-10-12" });
    expect(() => domain.moveWeek(f, "2026-10-05", "2026-10-12")).toThrow();
  });
  it("rejects corrupt imports and remaps conflicting IDs without losing either plan", () => {
    expect(() =>
      domain.parseBackup('{"version":1,"weeks":[{"start":"bad"}]}'),
    ).toThrow();
    expect(() =>
      domain.parseBackup(JSON.stringify({ ...fixture(), version: 99 })),
    ).toThrow();
    const incoming = fixture();
    incoming.weeks[0].projects[0].tasks[0].name = "Changed";
    const merged = domain.mergePlans(fixture(), incoming);
    expect(merged.weeks[0].projects).toHaveLength(2);
    expect(merged.weeks[0].projects[1].id).not.toBe("p1");
    expect(
      domain.mergePlans(fixture(), fixture()).weeks[0].projects,
    ).toHaveLength(1);
  });
  it("rejects imported IDs that cannot be stored as a single document", () => {
    const f = fixture();
    f.weeks[0].projects[0].id = "invalid/path";
    expect(() => domain.parseBackup(JSON.stringify(f))).toThrow();
  });
  it("rejects partial or invalid imported time slots", () => {
    for (const times of [
      { startTime: "09:00" },
      { endTime: "10:00" },
      { startTime: "", endTime: "" },
      { startTime: "9:00", endTime: "10:00" },
      { startTime: "09:00\n", endTime: "10:00" },
      { startTime: "09:00", endTime: "09:00" },
      { startTime: "11:00", endTime: "10:00" },
      { startTime: "23:00", endTime: "00:30" },
      { startTime: "23:00", endTime: "24:00" },
      { startTime: "09:00", endTime: 600 },
    ]) {
      const f = fixture();
      Object.assign(f.weeks[0].projects[0].tasks[0].subtasks[0], times);
      expect(() => domain.parseBackup(JSON.stringify(f))).toThrow(
        "invalid-subtask",
      );
    }
  });
  it("accepts old backups and preserves session times through copying and week moves", () => {
    const f = fixture();
    expect(domain.parseBackup(JSON.stringify(f))).toEqual(f);
    Object.assign(f.weeks[0].projects[0].tasks[0].subtasks[1], {
      startTime: "08:15",
      endTime: "09:45",
    });
    const timed = domain.parseBackup(JSON.stringify(f));
    const copy = domain.copyProjects(timed.weeks[0].projects, false);
    expect(copy[0].tasks[0].subtasks[1]).toMatchObject({
      day: 3,
      startTime: "08:15",
      endTime: "09:45",
      done: false,
      missed: [],
    });
    expect(copy[0].tasks[0].subtasks[1].id).not.toBe("s2");
    expect(
      domain.moveWeek(timed, "2026-10-05", "2026-10-19").weeks[0].projects[0]
        .tasks[0].subtasks[1],
    ).toMatchObject({ id: "s2", day: 3, startTime: "08:15", endTime: "09:45" });
  });
  it("carries unfinished sessions into the next week at the same weekday and time", () => {
    const f = fixture();
    Object.assign(f.weeks[0].projects[0].tasks[0].subtasks[1], {
      startTime: "08:15",
      endTime: "09:45",
    });
    const carried = domain.endWeek(
      domain.parseBackup(JSON.stringify(f)),
      "2026-10-05",
      true,
    );
    expect(carried.weeks[1].start).toBe("2026-10-12");
    expect(carried.weeks[1].projects[0].tasks[0].subtasks[0]).toMatchObject({
      day: 3,
      startTime: "08:15",
      endTime: "09:45",
      done: false,
      missed: [],
    });
    expect(carried.weeks[1].projects[0].tasks[0].subtasks[0].id).not.toBe("s2");
  });
  it("deduplicates identical imported entities regardless of JSON property order", () => {
    const incoming = fixture();
    const p = incoming.weeks[0].projects[0];
    incoming.weeks[0].projects[0] = { tasks: p.tasks, name: p.name, id: p.id };
    expect(
      domain.mergePlans(fixture(), incoming).weeks[0].projects,
    ).toHaveLength(1);
  });
  it("aggregates statistics by units and breaks streaks across calendar gaps", () => {
    const f = fixture();
    f.weeks[0].ended = true;
    const second = fixture().weeks[0];
    second.id = "w2";
    second.start = "2026-10-19";
    second.ended = true;
    second.projects[0].tasks[0].subtasks.forEach((s) => (s.done = true));
    f.weeks.push(second);
    const result = domain.statistics(f);
    expect(result.percent).toBe(58);
    expect(result.best?.start).toBe("2026-10-19");
    expect(result.streak).toBe(1);
  });
});

describe("Pomodoro backup and import", () => {
  const session = () => ({
    id: "pomodoro_focus",
    startedAt: 1_000,
    endedAt: 61_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 60_000,
    outcome: "completed" as const,
    task: { id: "task", name: "Study", projectName: "Math" },
  });
  const historyPlan = () => ({
    version: 1 as const,
    weeks: [],
    pomodoroSessions: [session()],
  });

  it("recognizes a history-only Guest workspace as data for migration", () => {
    expect(domain.hasPlanData?.(historyPlan())).toBe(true);
  });

  it("retains linked history without requiring its deleted task to exist", () => {
    expect(domain.parseBackup(JSON.stringify(historyPlan()))).toEqual(
      historyPlan(),
    );
  });

  it("rejects invalid focus accounting and snapshots in backups", () => {
    for (const invalid of [
      { startedAt: -1 },
      { startedAt: 1.5 },
      { endedAt: 999 },
      { endedAt: Number.MAX_SAFE_INTEGER + 1 },
      { plannedDurationMs: 0 },
      { plannedDurationMs: 1.5 },
      { focusedDurationMs: -1 },
      { focusedDurationMs: 60_001 },
      { focusedDurationMs: 59_999 },
      { outcome: "stopped" },
      { outcome: "unknown" },
      { task: { id: "bad/path", name: "Study", projectName: "Math" } },
      { task: { id: "task", name: "", projectName: "Math" } },
      { task: { id: "task", name: "Study" } },
      { task: { id: "task", name: "Study", projectName: "Math", done: true } },
      { unexpected: true },
    ]) {
      const plan = historyPlan();
      Object.assign(plan.pomodoroSessions[0], invalid);
      expect(() => domain.parseBackup(JSON.stringify(plan))).toThrow(
        "invalid-pomodoro-session",
      );
    }
    expect(() =>
      domain.parseBackup(
        JSON.stringify({ ...historyPlan(), pomodoroSessions: {} }),
      ),
    ).toThrow("invalid-pomodoro-history");
  });

  it("accepts a stopped partial focus session without counting it as completed", () => {
    const plan = historyPlan();
    Object.assign(plan.pomodoroSessions[0], {
      focusedDurationMs: 10_000,
      outcome: "stopped",
    });
    expect(domain.parseBackup(JSON.stringify(plan))).toEqual(plan);
  });

  it("rejects duplicate history IDs before they overwrite a cloud document", () => {
    const plan = historyPlan();
    plan.pomodoroSessions.push(session());
    expect(() => domain.parseBackup(JSON.stringify(plan))).toThrow(
      "invalid-id",
    );
  });

  it("merges history-only backups idempotently and keeps the original session", () => {
    const incoming = historyPlan();
    Object.assign(incoming.pomodoroSessions[0], {
      focusedDurationMs: 10_000,
      outcome: "stopped",
    });
    incoming.pomodoroSessions.push({ ...session(), id: "pomodoro_second" });
    const merged = domain.mergePlans(historyPlan(), incoming);
    expect(merged.pomodoroSessions).toEqual([
      session(),
      { ...session(), id: "pomodoro_second" },
    ]);
    expect(domain.mergePlans(merged, incoming).pomodoroSessions).toHaveLength(
      2,
    );
  });

  it("remaps an imported history link when conflicting tasks become copies", () => {
    const plan = {
      version: 1 as const,
      weeks: [
        {
          id: "week_2026-10-05",
          start: "2026-10-05",
          ended: false,
          projects: [
            {
              id: "project",
              name: "Math",
              tasks: [
                {
                  id: "task",
                  name: "Original",
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
    const incoming = structuredClone(plan);
    incoming.weeks[0].projects[0].tasks[0].name = "Study";
    const merged = domain.mergePlans(plan, {
      ...incoming,
      pomodoroSessions: [session()],
    });
    const copiedTask = merged.weeks[0].projects[1].tasks[0];
    expect(copiedTask.id).not.toBe("task");
    expect(merged.pomodoroSessions?.[0].task).toEqual({
      id: copiedTask.id,
      name: "Study",
      projectName: "Math",
    });
  });

  it("rejects a cross-kind history ID collision without mutating either workspace", () => {
    const local = {
      version: 1 as const,
      weeks: [
        {
          id: "week_2026-10-05",
          start: "2026-10-05",
          ended: false,
          projects: [{ id: "pomodoro_focus", name: "Math", tasks: [] }],
        },
      ],
    };
    const incoming = historyPlan();
    const beforeLocal = structuredClone(local);
    const beforeIncoming = structuredClone(incoming);
    expect(() => domain.mergePlans(local, incoming)).toThrow("invalid-id");
    expect(local).toEqual(beforeLocal);
    expect(incoming).toEqual(beforeIncoming);
  });
});
