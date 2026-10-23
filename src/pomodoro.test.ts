import { describe, expect, it } from "vitest";
import type { PomodoroRuntime, PomodoroSettings } from "./pomodoro";
import * as engine from "./pomodoro";
const at = 1_700_000_000_000;
const settings: PomodoroSettings = {
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 2,
  longBreakEvery: 2,
  sound: true,
  notifications: false,
};
function ready() {
  return engine.reducePomodoro(
    engine.initialPomodoroRuntime(),
    { type: "settings", settings },
    at,
  )?.runtime;
}
function apply(
  runtime: PomodoroRuntime | undefined,
  type: "start" | "pause" | "resume" | "stop" | "reset" | "next" | "complete",
  now = at,
) {
  return runtime && engine.reducePomodoro(runtime, { type }, now);
}

describe("Pomodoro engine", () => {
  it("starts a focus session with a fixed deadline and a stable session identity", () => {
    const result = apply(ready(), "start");
    expect(result?.runtime).toMatchObject({
      status: "running",
      phase: "focus",
      deadline: at + 60_000,
      elapsedMs: 0,
    });
    expect(result?.runtime.sessionId).toEqual(expect.any(String));
  });

  it("keeps the reducer deterministic while accepting an externally assigned session identity", () => {
    const runtime = ready();
    expect(apply(runtime, "start")).toEqual(apply(runtime, "start"));
    const result =
      runtime &&
      engine.reducePomodoro(
        runtime,
        { type: "start", sessionId: "fixed-session" },
        at,
      );
    expect(result?.runtime.sessionId).toBe("fixed-session");
  });

  it("excludes paused time from focus and reconstructs remaining time after a reload", () => {
    const started = apply(ready(), "start")?.runtime;
    const paused = apply(started, "pause", at + 20_000)?.runtime;
    expect(engine.remainingPomodoroMs(paused!, at + 300_000)).toBe(40_000);
    const resumed = apply(paused, "resume", at + 300_000)?.runtime;
    expect(engine.remainingPomodoroMs(resumed!, at + 310_000)).toBe(30_000);
    const stopped = apply(resumed, "stop", at + 310_000);
    expect(stopped?.session).toMatchObject({
      startedAt: at,
      endedAt: at + 310_000,
      focusedDurationMs: 30_000,
      outcome: "stopped",
    });
    expect(stopped?.runtime.completedInCycle).toBe(0);
  });

  it("finishes only the overdue phase and waits for a manual next step", () => {
    const started = apply(ready(), "start")?.runtime;
    const finished = apply(started, "complete", at + 600_000);
    expect(finished?.runtime).toMatchObject({
      status: "finished",
      phase: "focus",
      completedInCycle: 1,
    });
    expect(finished?.session).toMatchObject({
      endedAt: at + 60_000,
      focusedDurationMs: 60_000,
      outcome: "completed",
    });
    expect(finished?.phaseCompleted).toBe(true);
    expect(apply(finished?.runtime, "complete", at + 601_000)?.changed).toBe(
      false,
    );
    expect(
      apply(finished?.runtime, "next", at + 602_000)?.runtime,
    ).toMatchObject({
      status: "running",
      phase: "shortBreak",
      deadline: at + 662_000,
    });
  });

  it("does not finish early and preserves a selected task snapshot", () => {
    const task = { id: "task", name: "Write chapter", projectName: "Book" };
    const selected =
      ready() &&
      engine.reducePomodoro(ready()!, { type: "selectTask", task }, at)
        ?.runtime;
    const started = apply(selected, "start")?.runtime;
    expect(apply(started, "complete", at + 20_000)?.changed).toBe(false);
    expect(
      engine.reducePomodoro(started!, { type: "selectTask" }, at + 10_000)
        ?.changed,
    ).toBe(false);
    expect(apply(started, "stop", at + 20_000)?.session?.task).toEqual(task);
  });

  it("chooses a long break after the configured number of full sessions", () => {
    let runtime = apply(ready(), "start")?.runtime;
    runtime = apply(runtime, "complete", at + 60_000)?.runtime;
    runtime = apply(runtime, "next", at + 60_000)?.runtime;
    const breakResult = apply(runtime, "complete", at + 120_000);
    expect(breakResult?.session).toBeUndefined();
    runtime = apply(breakResult?.runtime, "next", at + 120_000)?.runtime;
    runtime = apply(runtime, "complete", at + 180_000)?.runtime;
    runtime = apply(runtime, "next", at + 180_000)?.runtime;
    expect(runtime).toMatchObject({
      phase: "longBreak",
      status: "running",
      completedInCycle: 2,
      deadline: at + 300_000,
    });
    const finished = apply(runtime, "complete", at + 300_000);
    expect(finished?.runtime.completedInCycle).toBe(0);
    expect(apply(finished?.runtime, "next", at + 300_000)?.runtime.phase).toBe(
      "focus",
    );
  });

  it("reset saves partial focus and returns to a fresh ready focus", () => {
    const started = apply(ready(), "start")?.runtime;
    const result = apply(started, "reset", at + 15_000);
    expect(result?.session).toMatchObject({
      outcome: "stopped",
      focusedDurationMs: 15_000,
    });
    expect(result?.runtime).toMatchObject({
      status: "ready",
      phase: "focus",
      elapsedMs: 0,
      completedInCycle: 0,
    });
    expect(result?.runtime.sessionId).toBeUndefined();
  });

  it("stopping an expired focus counts a completion and skips an expired long break safely", () => {
    const started = apply(ready(), "start")?.runtime;
    expect(apply(started, "stop", at + 70_000)?.session?.outcome).toBe(
      "completed",
    );
    const longBreak = started && {
      ...started,
      phase: "longBreak" as const,
      completedInCycle: 2,
    };
    expect(apply(longBreak, "stop", at + 10_000)?.runtime).toMatchObject({
      phase: "focus",
      status: "ready",
      completedInCycle: 0,
    });
  });

  it("does not save zero-duration sessions", () => {
    const result = apply(apply(ready(), "start")?.runtime, "stop");
    expect(result?.runtime.status).toBe("ready");
    expect(result?.session).toBeUndefined();
  });

  it("updates unstarted durations while preserving a running duration", () => {
    const started = apply(ready(), "start")?.runtime;
    const result =
      started &&
      engine.reducePomodoro(
        started,
        {
          type: "settings",
          settings: { ...settings, focusMinutes: 2, shortBreakMinutes: 3 },
        },
        at + 10_000,
      );
    expect(result?.runtime.plannedDurationMs).toBe(60_000);
    const finished = apply(result?.runtime, "complete", at + 60_000)?.runtime;
    expect(
      apply(finished, "next", at + 60_000)?.runtime.plannedDurationMs,
    ).toBe(180_000);
  });

  it.each([
    ["focusMinutes", 0],
    ["focusMinutes", 121],
    ["shortBreakMinutes", 31],
    ["longBreakMinutes", 61],
    ["longBreakEvery", 1],
    ["longBreakEvery", 13],
    ["focusMinutes", Number.NaN],
    ["longBreakEvery", 2.5],
  ])(
    "rejects invalid %s=%s settings without changing state",
    (field, value) => {
      const runtime = ready();
      const result =
        runtime &&
        engine.reducePomodoro(
          runtime,
          { type: "settings", settings: { ...settings, [field]: value } },
          at,
        );
      expect(result?.changed).toBe(false);
    },
  );

  it("ignores stale revisions and stale session completion actions", () => {
    const runtime = apply(ready(), "start")?.runtime;
    expect(
      runtime &&
        engine.reducePomodoro(
          runtime,
          { type: "stop", expectedRevision: runtime.revision - 1 },
          at + 60_000,
        )?.changed,
    ).toBe(false);
    expect(
      runtime &&
        engine.reducePomodoro(
          runtime,
          { type: "complete", expectedSessionId: "previous" },
          at + 60_000,
        )?.changed,
    ).toBe(false);
  });
});
