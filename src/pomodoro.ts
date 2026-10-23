export interface PomodoroTaskSnapshot {
  id: string;
  name: string;
  projectName: string;
}

export interface PomodoroSession {
  id: string;
  startedAt: number;
  endedAt: number;
  plannedDurationMs: number;
  focusedDurationMs: number;
  outcome: "completed" | "stopped";
  task?: PomodoroTaskSnapshot;
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  sound: boolean;
  notifications: boolean;
}

export interface PomodoroRuntime {
  version: 1;
  revision: number;
  phase: "focus" | "shortBreak" | "longBreak";
  status: "ready" | "running" | "paused" | "finished";
  settings: PomodoroSettings;
  completedInCycle: number;
  task?: PomodoroTaskSnapshot;
  sessionId?: string;
  startedAt?: number;
  runStartedAt?: number;
  deadline?: number;
  plannedDurationMs: number;
  elapsedMs: number;
  completionRevision?: number;
  completionPhase?: PomodoroRuntime["phase"];
}

type Guard = { expectedRevision?: number; expectedSessionId?: string };
export type PomodoroAction = Guard &
  (
    | { type: "start" | "next"; sessionId?: string }
    | { type: "pause" | "resume" | "stop" | "reset" | "complete" }
    | { type: "selectTask"; task?: PomodoroTaskSnapshot }
    | { type: "settings"; settings: PomodoroSettings }
  );

export interface PomodoroResult {
  runtime: PomodoroRuntime;
  session?: PomodoroSession;
  phaseCompleted: boolean;
  changed: boolean;
}

export function initialPomodoroRuntime(): PomodoroRuntime {
  return {
    version: 1,
    revision: 0,
    phase: "focus",
    status: "ready",
    settings: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      sound: true,
      notifications: false,
    },
    completedInCycle: 0,
    plannedDurationMs: 25 * 60_000,
    elapsedMs: 0,
  };
}

export function validPomodoroSettings(settings: PomodoroSettings): boolean {
  const limits = [
    [settings.focusMinutes, 1, 120],
    [settings.shortBreakMinutes, 1, 30],
    [settings.longBreakMinutes, 1, 60],
    [settings.longBreakEvery, 2, 12],
  ];
  return (
    limits.every(
      ([value, min, max]) =>
        Number.isInteger(value) && value >= min && value <= max,
    ) &&
    typeof settings.sound === "boolean" &&
    typeof settings.notifications === "boolean"
  );
}

function duration(
  phase: PomodoroRuntime["phase"],
  settings: PomodoroSettings,
): number {
  return (
    60_000 *
    (phase === "focus"
      ? settings.focusMinutes
      : phase === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes)
  );
}

function elapsed(runtime: PomodoroRuntime, now: number): number {
  return Math.min(
    runtime.plannedDurationMs,
    Math.max(
      0,
      runtime.elapsedMs +
        (runtime.status === "running" && runtime.runStartedAt !== undefined
          ? Math.max(0, now - runtime.runStartedAt)
          : 0),
    ),
  );
}

export function remainingPomodoroMs(
  runtime: PomodoroRuntime,
  now: number,
): number {
  return runtime.status === "finished"
    ? 0
    : runtime.plannedDurationMs - elapsed(runtime, now);
}

function clearTiming(runtime: PomodoroRuntime): PomodoroRuntime {
  const {
    sessionId: _session,
    startedAt: _start,
    runStartedAt: _run,
    deadline: _deadline,
    ...rest
  } = runtime;
  return rest;
}

export function reducePomodoro(
  runtime: PomodoroRuntime,
  action: PomodoroAction,
  now: number,
): PomodoroResult {
  const unchanged = (): PomodoroResult => ({
    runtime,
    changed: false,
    phaseCompleted: false,
  });
  if (
    !Number.isFinite(now) ||
    (action.expectedRevision !== undefined &&
      action.expectedRevision !== runtime.revision) ||
    (action.expectedSessionId !== undefined &&
      action.expectedSessionId !== runtime.sessionId)
  )
    return unchanged();
  const changed = (
    next: PomodoroRuntime,
    session?: PomodoroSession,
    phaseCompleted = false,
  ): PomodoroResult => ({
    runtime: {
      ...next,
      revision: runtime.revision + 1,
      ...(phaseCompleted
        ? {
            completionRevision: runtime.revision + 1,
            completionPhase: runtime.phase,
          }
        : {}),
    },
    ...(session ? { session } : {}),
    phaseCompleted,
    changed: true,
  });
  const active = runtime.status === "running" || runtime.status === "paused";
  const elapsedMs = elapsed(runtime, now);
  const expired = active && elapsedMs >= runtime.plannedDurationMs;
  const finish = (completed: boolean, reset: boolean): PomodoroResult => {
    const session: PomodoroSession | undefined =
      runtime.phase === "focus" &&
      active &&
      elapsedMs > 0 &&
      runtime.sessionId &&
      runtime.startedAt !== undefined
        ? {
            id: runtime.sessionId,
            startedAt: runtime.startedAt,
            endedAt:
              completed && runtime.deadline !== undefined
                ? runtime.deadline
                : now,
            plannedDurationMs: runtime.plannedDurationMs,
            focusedDurationMs: elapsedMs,
            outcome: completed ? "completed" : "stopped",
            ...(runtime.task ? { task: { ...runtime.task } } : {}),
          }
        : undefined;
    const completedInCycle =
      runtime.phase === "longBreak"
        ? 0
        : runtime.completedInCycle +
          (completed && runtime.phase === "focus" ? 1 : 0);
    if (completed && !reset)
      return changed(
        {
          ...runtime,
          status: "finished",
          elapsedMs: runtime.plannedDurationMs,
          runStartedAt: undefined,
          deadline: undefined,
          completedInCycle,
        },
        session,
        true,
      );
    return changed(
      {
        ...clearTiming(runtime),
        status: "ready",
        phase: "focus",
        elapsedMs: 0,
        plannedDurationMs: duration("focus", runtime.settings),
        completedInCycle,
      },
      session,
      completed,
    );
  };

  switch (action.type) {
    case "start":
    case "next": {
      if (
        action.type === "start"
          ? runtime.status !== "ready"
          : runtime.status !== "finished"
      )
        return unchanged();
      const phase =
        action.type === "next"
          ? runtime.phase === "focus"
            ? runtime.completedInCycle >= runtime.settings.longBreakEvery
              ? "longBreak"
              : "shortBreak"
            : "focus"
          : runtime.phase;
      const plannedDurationMs = duration(phase, runtime.settings);
      return changed({
        ...clearTiming(runtime),
        phase,
        status: "running",
        elapsedMs: 0,
        plannedDurationMs,
        sessionId: action.sessionId ?? `pomodoro_${now}_${runtime.revision}`,
        startedAt: now,
        runStartedAt: now,
        deadline: now + plannedDurationMs,
      });
    }
    case "pause":
      if (runtime.status !== "running") return unchanged();
      if (expired) return finish(true, false);
      return changed({
        ...runtime,
        status: "paused",
        elapsedMs,
        runStartedAt: undefined,
        deadline: undefined,
      });
    case "resume":
      if (runtime.status !== "paused") return unchanged();
      return changed({
        ...runtime,
        status: "running",
        runStartedAt: now,
        deadline: now + runtime.plannedDurationMs - elapsedMs,
      });
    case "complete":
      return expired ? finish(true, false) : unchanged();
    case "stop":
      return active ? finish(expired, false) : unchanged();
    case "reset":
      return finish(expired, true);
    case "selectTask": {
      if (active) return unchanged();
      if (JSON.stringify(runtime.task) === JSON.stringify(action.task))
        return unchanged();
      const { task: _task, ...rest } = runtime;
      return changed({
        ...rest,
        ...(action.task ? { task: { ...action.task } } : {}),
      });
    }
    case "settings":
      if (
        !validPomodoroSettings(action.settings) ||
        JSON.stringify(runtime.settings) === JSON.stringify(action.settings)
      )
        return unchanged();
      return changed({
        ...runtime,
        settings: { ...action.settings },
        plannedDurationMs:
          runtime.status === "ready"
            ? duration(runtime.phase, action.settings)
            : runtime.plannedDurationMs,
      });
  }
}
