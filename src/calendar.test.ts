import { describe, expect, it } from "vitest";
import type { Project } from "./domain";
import * as calendar from "./calendar";

const projects = (): Project[] => [
  {
    id: "project",
    name: "Study",
    tasks: [
      {
        id: "task",
        name: "Read",
        note: "Keep task notes",
        done: false,
        subtasks: [
          {
            id: "session",
            day: 0,
            weight: 2,
            note: "Chapter 1",
            done: true,
            missed: [2, 3],
            dayOrder: 2048,
            startTime: "09:00",
            endTime: "10:30",
          },
        ],
      },
    ],
  },
];

describe("calendar times", () => {
  it("converts padded clock values and minute boundaries", () => {
    expect(calendar.timeToMinutes("00:00")).toBe(0);
    expect(calendar.timeToMinutes("09:05")).toBe(545);
    expect(calendar.timeToMinutes("23:59")).toBe(1439);
    expect(calendar.minutesToTime(0)).toBe("00:00");
    expect(calendar.minutesToTime(545)).toBe("09:05");
    expect(calendar.minutesToTime(1439)).toBe("23:59");
  });

  it("accepts only complete chronological same-day ranges", () => {
    expect(calendar.validTimeRange("00:00", "23:59")).toBe(true);
    expect(calendar.validTimeRange("09:05", "09:06")).toBe(true);
    for (const [start, end] of [
      ["9:00", "10:00"],
      ["09:00", "09:00"],
      ["10:00", "09:00"],
      ["23:00", "00:30"],
      ["23:00", "24:00"],
      ["09:60", "11:00"],
      ["09:00:00", "10:00"],
      ["09:00\n", "10:00"],
      ["09:00", "10:00\n"],
      ["", "10:00"],
    ])
      expect(calendar.validTimeRange(start, end)).toBe(false);
  });
});

describe("calendar overlap layout", () => {
  it("orders timed sessions independently of board order and excludes untimed days", () => {
    const f = projects();
    const step = f[0].tasks[0].subtasks[0];
    f[0].tasks[0].subtasks = [
      {
        ...step,
        id: "late",
        startTime: "11:00",
        endTime: "12:00",
        dayOrder: 0,
      },
      { ...step, id: "other-day", day: 1 },
      { ...step, id: "untimed", startTime: undefined, endTime: undefined },
      { ...step, id: "early-b", startTime: "08:00", endTime: "08:30" },
      { ...step, id: "early-a", startTime: "08:00", endTime: "08:30" },
    ];
    const sessions = calendar.timedSessions(f, 0);
    expect(sessions.map((s) => [s.step.id, s.start, s.end])).toEqual([
      ["early-a", 480, 510],
      ["early-b", 480, 510],
      ["late", 660, 720],
    ]);
    expect(calendar.timedSessions(f, 1).map((s) => s.step.id)).toEqual([
      "other-day",
    ]);
    expect(f[0].tasks[0].subtasks[0].id).toBe("late");
  });

  it("shares lanes across connected overlaps and resets width for adjacent groups", () => {
    const f = projects();
    const step = f[0].tasks[0].subtasks[0];
    f[0].tasks[0].subtasks = [
      { ...step, id: "a", startTime: "09:00", endTime: "10:00" },
      { ...step, id: "b", startTime: "09:15", endTime: "09:45" },
      { ...step, id: "c", startTime: "09:30", endTime: "10:30" },
      { ...step, id: "d", startTime: "10:00", endTime: "11:00" },
      { ...step, id: "e", startTime: "11:00", endTime: "12:00" },
    ];
    expect(
      calendar.timedSessions(f, 0).map((s) => [s.step.id, s.column, s.columns]),
    ).toEqual([
      ["a", 0, 3],
      ["b", 1, 3],
      ["c", 2, 3],
      ["d", 0, 3],
      ["e", 0, 1],
    ]);
  });
});

describe("calendar rescheduling", () => {
  it("preserves duration and work details when dragging onto another day", () => {
    const f = projects();
    const step = f[0].tasks[0].subtasks[0];
    f[0].tasks[0].subtasks.push({
      ...step,
      id: "existing",
      day: 3,
      dayOrder: 1024,
    });
    const moved = calendar.rescheduleSession(f, "session", 3, 810);
    expect(moved[0].tasks[0].subtasks[0]).toEqual({
      id: "session",
      day: 3,
      weight: 2,
      note: "Chapter 1",
      done: true,
      missed: [2],
      dayOrder: 2048,
      startTime: "13:30",
      endTime: "15:00",
    });
    expect(f[0].tasks[0].subtasks[0].day).toBe(0);
    expect(f[0].tasks[0].subtasks[0].startTime).toBe("09:00");
  });

  it("clamps a same-day drag to midnight or the final minute without reordering", () => {
    const f = projects();
    expect(
      calendar.rescheduleSession(f, "session", 0, -30)[0].tasks[0].subtasks[0],
    ).toMatchObject({ startTime: "00:00", endTime: "01:30", dayOrder: 2048 });
    expect(
      calendar.rescheduleSession(f, "session", 0, 1430)[0].tasks[0].subtasks[0],
    ).toMatchObject({ startTime: "22:29", endTime: "23:59", dayOrder: 2048 });
  });

  it("rejects missing, untimed, malformed, or invalid drag destinations", () => {
    const f = projects();
    for (const [day, start] of [
      [-1, 600],
      [7, 600],
      [0.5, 600],
      [0, NaN],
      [0, Infinity],
      [0, 600.5],
    ])
      expect(() =>
        calendar.rescheduleSession(f, "session", day, start),
      ).toThrow();
    expect(() => calendar.rescheduleSession(f, "missing", 0, 600)).toThrow();
    delete f[0].tasks[0].subtasks[0].startTime;
    delete f[0].tasks[0].subtasks[0].endTime;
    expect(() => calendar.rescheduleSession(f, "session", 0, 600)).toThrow();
    f[0].tasks[0].subtasks[0].startTime = "12:00";
    f[0].tasks[0].subtasks[0].endTime = "11:00";
    expect(() => calendar.rescheduleSession(f, "session", 0, 600)).toThrow();
  });
});
