import { describe, expect, it } from "vitest";
import { parseBackup, type Plan } from "../domain";
import {
  applyExam,
  previewExam,
  applyRecurrence,
  previewRecurrence,
  editOccurrence,
  captureTemplate,
  builtInTemplates,
  previewTemplate,
  applyTemplate,
  type ExamInput,
  type RecurrenceInput,
} from "./planning";

const empty = (): Plan => ({ version: 1, weeks: [] });
const now = new Date("2026-12-31T02:10:30Z"); // 09:10:30 in Vietnam.
const input = (patch: Partial<ExamInput> = {}): ExamInput => ({
  subject: "Giải tích",
  examDate: "2027-01-04",
  topics: [{ name: "Tích phân", minutes: 120 }],
  availability: [
    { day: 3, startTime: "09:00", endTime: "12:00" },
    { day: 4, startTime: "09:00", endTime: "12:00" },
  ],
  ...patch,
});

const recurrenceInput = (
  patch: Partial<RecurrenceInput> = {},
): RecurrenceInput => ({
  name: "IELTS",
  note: "Listening",
  weight: 2,
  days: [0, 2],
  startTime: "18:00",
  endTime: "19:00",
  startDate: "2027-01-04",
  ...patch,
});
const allTasks = (plan: Plan) =>
  plan.weeks.flatMap((w) => w.projects.flatMap((p) => p.tasks));

describe("finite recurring schedules", () => {
  it("requires a fresh preview when an occurrence passed before confirmation", () => {
    const preview = previewRecurrence(empty(), recurrenceInput(), now);
    expect(() =>
      applyRecurrence(
        empty(),
        preview,
        false,
        new Date("2027-01-04T12:00:01Z"),
      ),
    ).toThrow("preview-expired");
    const applied = applyRecurrence(empty(), preview, false, now);
    expect(
      applyRecurrence(
        applied,
        preview,
        false,
        new Date("2027-06-01T00:00:00Z"),
      ),
    ).toEqual(applied);
  });
  it("rejects a series name that cannot be represented by its generated project", () => {
    expect(() =>
      previewRecurrence(
        empty(),
        recurrenceInput({ name: "a".repeat(301) }),
        now,
      ),
    ).toThrow("invalid-recurrence");
  });

  it("materializes twelve weeks by default with stable occurrence identities", () => {
    const preview = previewRecurrence(empty(), recurrenceInput(), now);
    expect(preview.sessions).toHaveLength(24);
    expect(preview.sessions[0].date).toBe("2027-01-04");
    expect(preview.sessions.at(-1)?.date).toBe("2027-03-24");
    const applied = applyRecurrence(empty(), preview);
    expect(allTasks(applied)).toHaveLength(24);
    expect(allTasks(applied)[0].source).toMatchObject({
      kind: "recurrence",
      occurrenceDate: "2027-01-04",
      seriesId: preview.rule.id,
    });
    expect(applyRecurrence(applied, preview)).toEqual(applied);
    expect(() =>
      previewRecurrence(
        empty(),
        recurrenceInput({ endDate: "2027-07-05" }),
        now,
      ),
    ).toThrow("recurrence-range");
  });

  it("requires explicit conflict confirmation but does not block an accepted overlap", () => {
    const original = applyRecurrence(
      empty(),
      previewRecurrence(
        empty(),
        recurrenceInput({ endDate: "2027-01-10" }),
        now,
      ),
    );
    const preview = previewRecurrence(
      original,
      recurrenceInput({ name: "Coding", endDate: "2027-01-10" }),
      now,
    );
    expect(preview.conflicts).toHaveLength(2);
    expect(() => applyRecurrence(original, preview)).toThrow(
      "recurrence-conflicts",
    );
    expect(allTasks(applyRecurrence(original, preview, true))).toHaveLength(4);
  });

  it("preserves completed, detached, and ended-week occurrences when changing future sessions", () => {
    let plan = applyRecurrence(
      empty(),
      previewRecurrence(
        empty(),
        recurrenceInput({ endDate: "2027-01-31" }),
        now,
      ),
    );
    const tasks = allTasks(plan);
    tasks[1].subtasks[0].done = true;
    plan = editOccurrence(
      plan,
      tasks[2].id,
      { name: "Private edit", startTime: "20:00", endTime: "21:00" },
      "single",
      now,
    );
    plan.weeks[2].ended = true;
    plan = editOccurrence(
      plan,
      tasks[0].id,
      { name: "Updated", startTime: "19:00", endTime: "20:00" },
      "future",
      now,
    );
    expect(allTasks(plan).map((t) => t.name)).toEqual([
      "Updated",
      "IELTS",
      "Private edit",
      "Updated",
      "IELTS",
      "IELTS",
      "Updated",
      "Updated",
    ]);
    expect(allTasks(plan)[2].subtasks[0].startTime).toBe("20:00");
    expect(allTasks(plan)[0].source?.detached).not.toBe(true);
  });

  it("keeps deleted occurrences deleted after backup and reapplying the old preview", () => {
    const preview = previewRecurrence(
      empty(),
      recurrenceInput({ endDate: "2027-01-31" }),
      now,
    );
    let plan = applyRecurrence(empty(), preview);
    const removedId = allTasks(plan)[2].id;
    plan = editOccurrence(plan, removedId, null, "single", now);
    plan = parseBackup(JSON.stringify(plan));
    expect(
      allTasks(applyRecurrence(plan, preview)).some((t) => t.id === removedId),
    ).toBe(false);
    plan = editOccurrence(plan, allTasks(plan)[2].id, null, "stop", now);
    expect(allTasks(plan)).toHaveLength(2);
    expect(plan.pro?.recurrenceRules?.[0].stoppedFrom).toBe("2027-01-13");
  });

  it("omits ended weeks and past time today instead of generating historical sessions", () => {
    const plan: Plan = {
      version: 1,
      weeks: [{ id: "w", start: "2026-12-28", ended: true, projects: [] }],
    };
    expect(
      previewRecurrence(
        plan,
        recurrenceInput({
          startDate: "2026-12-28",
          endDate: "2027-01-10",
          days: [3, 4],
        }),
        now,
      ).sessions.map((s) => s.date),
    ).toEqual(["2027-01-07", "2027-01-08"]);
    expect(
      previewRecurrence(
        empty(),
        recurrenceInput({
          startDate: "2026-12-31",
          endDate: "2026-12-31",
          days: [3],
          startTime: "09:00",
          endTime: "10:00",
        }),
        now,
      ).sessions,
    ).toHaveLength(0);
  });
});

describe("plan templates", () => {
  it("captures content with new identities without recurrence links or completion history", () => {
    const plan = applyRecurrence(
      empty(),
      previewRecurrence(
        empty(),
        recurrenceInput({ endDate: "2027-01-10" }),
        now,
      ),
    );
    const week = plan.weeks[0];
    week.projects[0].tasks[0].subtasks[0].done = true;
    week.projects[0].tasks[0].subtasks[0].missed = [1];
    const template = captureTemplate(
      week,
      [week.projects[0].id],
      "Lịch của tôi",
      "my-template",
    );
    expect(template.projects[0].id).not.toBe(week.projects[0].id);
    expect(template.projects[0].tasks[0].source).toBeUndefined();
    expect(template.projects[0].tasks[0].subtasks[0]).toMatchObject({
      done: false,
      missed: [],
      day: 0,
      startTime: "18:00",
      endTime: "19:00",
    });
    expect(template.projects[0].tasks[0].subtasks[0].source).toBeUndefined();
  });

  it("shifts date and datetime deadlines over a year boundary while preserving weekday and hours", () => {
    const template = builtInTemplates("vi")[0];
    template.projects[0].deadline = "2026-01-11T23:59";
    template.projects[0].tasks[0].deadline = "2026-01-06";
    const preview = previewTemplate(empty(), template, "2026-12-28");
    expect(preview.projects[0].deadline).toBe("2027-01-03T23:59");
    expect(preview.projects[0].tasks[0].deadline).toBe("2026-12-29");
    expect(preview.projects[0].tasks[0].subtasks[0]).toMatchObject({
      day: 0,
      startTime: "19:00",
      endTime: "19:50",
      done: false,
    });
    expect(preview.projects[0].id).not.toBe(template.projects[0].id);
  });

  it("appends with fresh IDs, confirms conflicts and keeps a repeated apply idempotent", () => {
    const template = builtInTemplates("en")[0];
    const firstPreview = previewTemplate(empty(), template, "2027-01-04");
    const first = applyTemplate(empty(), firstPreview);
    const secondPreview = previewTemplate(first, template, "2027-01-04");
    expect(secondPreview.conflicts.length).toBeGreaterThan(0);
    expect(() => applyTemplate(first, secondPreview)).toThrow(
      "template-conflicts",
    );
    const second = applyTemplate(first, secondPreview, true);
    expect(second.weeks[0].projects).toHaveLength(2);
    expect(second.weeks[0].projects[0].id).not.toBe(
      second.weeks[0].projects[1].id,
    );
    expect(applyTemplate(second, secondPreview, true)).toEqual(second);
    expect(parseBackup(JSON.stringify(second))).toEqual(second);
  });

  it("counts each conflicting session once when it overlaps both existing work and its own template", () => {
    const template = builtInTemplates("vi")[0];
    const existing = applyTemplate(
      empty(),
      previewTemplate(empty(), template, "2027-01-04"),
    );
    const firstTask = template.projects[0].tasks[0];
    template.projects[0].tasks = [
      firstTask,
      { ...structuredClone(firstTask), id: "duplicate-topic" },
    ];
    expect(
      previewTemplate(existing, template, "2027-01-04").conflicts,
    ).toHaveLength(2);
  });

  it("provides all three templates in both languages and rejects closed destination weeks", () => {
    expect(builtInTemplates("vi").map((t) => t.name)).toEqual([
      "Ôn thi cuối kỳ",
      "Luyện IELTS",
      "Học lập trình",
    ]);
    expect(builtInTemplates("en").map((t) => t.name)).toEqual([
      "Final exam revision",
      "IELTS preparation",
      "Learn programming",
    ]);
    const closed: Plan = {
      version: 1,
      weeks: [{ id: "w", start: "2027-01-04", ended: true, projects: [] }],
    };
    expect(() =>
      previewTemplate(closed, builtInTemplates("vi")[0], "2027-01-04"),
    ).toThrow("destination-ended");
  });
});

describe("exam scheduling", () => {
  it("requires recalculation if the first session passed while its preview was open", () => {
    const preview = previewExam(empty(), input(), now);
    expect(() =>
      applyExam(empty(), preview, new Date("2026-12-31T03:00:00Z")),
    ).toThrow("preview-expired");
    const applied = applyExam(empty(), preview, now);
    expect(
      applyExam(applied, preview, new Date("2027-01-05T00:00:00Z")),
    ).toEqual(applied);
  });
  it("merges availability and keeps the default 50 minute sessions after the current Vietnam minute", () => {
    const preview = previewExam(
      empty(),
      input({
        availability: [
          { day: 3, startTime: "09:00", endTime: "11:00" },
          { day: 3, startTime: "10:00", endTime: "12:00" },
        ],
      }),
      now,
    );
    expect(
      preview.sessions.map((s) => [s.date, s.startTime, s.endTime]),
    ).toEqual([
      ["2026-12-31", "09:11", "10:01"],
      ["2026-12-31", "10:01", "10:51"],
      ["2026-12-31", "10:51", "11:11"],
    ]);
    expect(preview).toMatchObject({
      complete: true,
      requiredMinutes: 120,
      scheduledMinutes: 120,
      missingMinutes: 0,
    });
  });

  it("avoids busy slots, ended weeks and exam day across the year boundary", () => {
    const plan: Plan = {
      version: 1,
      weeks: [
        {
          id: "w",
          start: "2026-12-28",
          ended: false,
          projects: [
            {
              id: "p",
              name: "Busy",
              tasks: [
                {
                  id: "t",
                  name: "Lecture",
                  note: "",
                  done: false,
                  subtasks: [
                    {
                      id: "s",
                      day: 3,
                      weight: 1,
                      note: "",
                      done: false,
                      missed: [],
                      startTime: "09:00",
                      endTime: "11:30",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const preview = previewExam(plan, input(), now);
    expect(
      preview.sessions.map((s) => [s.date, s.startTime, s.endTime]),
    ).toEqual([
      ["2027-01-01", "09:00", "09:50"],
      ["2027-01-01", "09:50", "10:40"],
      ["2027-01-01", "10:40", "11:00"],
    ]);
    plan.weeks[0].ended = true;
    expect(previewExam(plan, input(), now)).toMatchObject({
      complete: false,
      scheduledMinutes: 0,
      missingMinutes: 120,
    });
    expect(
      previewExam(
        empty(),
        input({
          examDate: "2027-01-01",
          availability: [{ day: 4, startTime: "09:00", endTime: "12:00" }],
        }),
        now,
      ).sessions,
    ).toHaveLength(0);
  });

  it("rejects invalid or overlong ranges and never applies an incomplete preview", () => {
    expect(() =>
      previewExam(empty(), input({ examDate: "2027-06-30" }), now),
    ).toThrow("exam-range");
    expect(() =>
      previewExam(
        empty(),
        input({
          availability: [{ day: 3, startTime: "23:00", endTime: "01:00" }],
        }),
        now,
      ),
    ).toThrow("invalid-availability");
    expect(() =>
      previewExam(
        empty(),
        input({ topics: [{ name: "Invalid", minutes: 0 }] }),
        now,
      ),
    ).toThrow("invalid-topics");
    expect(() =>
      applyExam(
        empty(),
        previewExam(empty(), input({ availability: [] }), now),
      ),
    ).toThrow("incomplete-preview");
  });

  it("applies a preview once as one immutable plan and keeps its ledger after generated tasks are deleted", () => {
    const plan = empty();
    const preview = previewExam(plan, input(), now);
    const applied = applyExam(plan, preview);
    expect(plan.weeks).toHaveLength(0);
    expect(applied.weeks[0].projects[0]).toMatchObject({
      name: "Giải tích",
      deadline: "2027-01-04",
    });
    expect(applied.weeks[0].projects[0].tasks).toHaveLength(3);
    expect(applyExam(applied, preview)).toEqual(applied);
    applied.weeks[0].projects = [];
    const reloaded = parseBackup(JSON.stringify(applied));
    expect(applyExam(reloaded, preview).weeks[0].projects).toHaveLength(0);
  });

  it("rechecks an ended destination when applying an older preview", () => {
    const preview = previewExam(empty(), input(), now);
    const closed: Plan = {
      version: 1,
      weeks: [{ id: "w", start: "2026-12-28", ended: true, projects: [] }],
    };
    expect(() => applyExam(closed, preview)).toThrow("destination-ended");
  });
});
