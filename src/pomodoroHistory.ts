import type { PomodoroSession } from "./pomodoro";

export function mergePomodoroSessions(
  existing: readonly PomodoroSession[] = [],
  incoming: readonly PomodoroSession[] = [],
): PomodoroSession[] {
  const sessions = new Map<string, PomodoroSession>();
  for (const session of [...existing, ...incoming])
    if (!sessions.has(session.id)) sessions.set(session.id, session);
  return [...sessions.values()].sort(
    (a, b) => a.endedAt - b.endedAt || a.id.localeCompare(b.id),
  );
}

const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 200 &&
  !/[^A-Za-z0-9_.:-]/.test(value) &&
  value !== "." &&
  value !== ".." &&
  !/^__.*__$/.test(value);

const positiveText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max && value.trim().length > 0;

const nonnegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const validTimestamp = (value: unknown): value is number =>
  nonnegativeInteger(value) && value <= 8_640_000_000_000_000;

export function validPomodoroSession(value: unknown): value is PomodoroSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const session = value as PomodoroSession;
  if (
    Object.keys(session).some(
      (key) =>
        ![
          "id",
          "startedAt",
          "endedAt",
          "plannedDurationMs",
          "focusedDurationMs",
          "outcome",
          "task",
        ].includes(key),
    ) ||
    !validId(session.id) ||
    !validTimestamp(session.startedAt) ||
    !validTimestamp(session.endedAt) ||
    session.endedAt < session.startedAt ||
    !nonnegativeInteger(session.plannedDurationMs) ||
    session.plannedDurationMs === 0 ||
    !nonnegativeInteger(session.focusedDurationMs) ||
    session.focusedDurationMs > session.plannedDurationMs ||
    (session.outcome === "completed"
      ? session.focusedDurationMs !== session.plannedDurationMs
      : session.outcome !== "stopped" ||
        session.focusedDurationMs >= session.plannedDurationMs)
  )
    return false;
  if (session.task !== undefined) {
    const task = session.task;
    if (
      !task ||
      typeof task !== "object" ||
      Array.isArray(task) ||
      Object.keys(task).some(
        (key) => !["id", "name", "projectName"].includes(key),
      ) ||
      !validId(task.id) ||
      !positiveText(task.name, 500) ||
      !positiveText(task.projectName, 300)
    )
      return false;
  }
  return true;
}
