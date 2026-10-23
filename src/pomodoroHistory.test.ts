import { expect, it } from "vitest";
import type { PomodoroSession } from "./pomodoro";
import { parseBackup } from "./domain";
import { mergePomodoroSessions, validPomodoroSession } from "./pomodoroHistory";

const session = (id: string, endedAt: number): PomodoroSession => ({
  id,
  startedAt: 1_000,
  endedAt,
  plannedDurationMs: 60_000,
  focusedDurationMs: 60_000,
  outcome: "completed",
});

it("preserves a finalized session when a stale tab supplies the same ID", () => {
  const existing = session("pomodoro_existing", 61_000);
  const incoming = {
    ...existing,
    focusedDurationMs: 10_000,
    outcome: "stopped" as const,
  };
  expect(mergePomodoroSessions([existing], [incoming])).toEqual([existing]);
});

it("unions independent sessions chronologically without mutating either source", () => {
  const later = session("pomodoro_later", 121_000);
  const earlier = session("pomodoro_earlier", 61_000);
  const existing = [later];
  const incoming = [earlier];
  expect(mergePomodoroSessions(existing, incoming)).toEqual([earlier, later]);
  expect(existing).toEqual([later]);
  expect(incoming).toEqual([earlier]);
});

const maxDateTimestamp = 8_640_000_000_000_000;

it("rejects history timestamps outside the Date range before importing them", () => {
  for (const times of [
    { startedAt: 1_000, endedAt: maxDateTimestamp + 1 },
    { startedAt: maxDateTimestamp + 1, endedAt: maxDateTimestamp + 60_001 },
    { startedAt: 1_000, endedAt: Number.MAX_SAFE_INTEGER },
    {
      startedAt: Number.MAX_SAFE_INTEGER - 60_000,
      endedAt: Number.MAX_SAFE_INTEGER,
    },
  ]) {
    const invalid = { ...session("pomodoro_invalid_date", 61_000), ...times };
    expect(validPomodoroSession(invalid)).toBe(false);
    expect(() =>
      parseBackup(
        JSON.stringify({ version: 1, weeks: [], pomodoroSessions: [invalid] }),
      ),
    ).toThrow("invalid-pomodoro-session");
  }
});

it("accepts the exact Date boundary for history timestamps", () => {
  const boundary = {
    ...session("pomodoro_date_boundary", maxDateTimestamp),
    startedAt: maxDateTimestamp - 60_000,
  };
  expect(validPomodoroSession(boundary)).toBe(true);
  expect(
    parseBackup(
      JSON.stringify({ version: 1, weeks: [], pomodoroSessions: [boundary] }),
    ).pomodoroSessions,
  ).toEqual([boundary]);
  expect(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
      new Date(boundary.endedAt),
    ),
  ).not.toThrow();
});

it("keeps safe integer durations independent of the timestamp Date range", () => {
  const longDuration = {
    ...session("pomodoro_long_duration", 61_000),
    plannedDurationMs: Number.MAX_SAFE_INTEGER,
    focusedDurationMs: Number.MAX_SAFE_INTEGER,
  };
  expect(validPomodoroSession(longDuration)).toBe(true);
});
