import { moveBoardCard } from "./boardOrder";
import type { Project, Subtask, Task } from "./domain";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(time: string): number {
  if (typeof time !== "string" || !TIME_PATTERN.test(time)) return NaN;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

export function minutesToTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439)
    throw new Error("invalid-time");
  return (
    String(Math.floor(minutes / 60)).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0")
  );
}

export function validTimeRange(start: string, end: string): boolean {
  return timeToMinutes(start) < timeToMinutes(end);
}
export interface CalendarSession {
  project: Project;
  task: Task;
  step: Subtask;
  start: number;
  end: number;
  column: number;
  columns: number;
}

export function timedSessions(
  projects: Project[],
  day: number,
): CalendarSession[] {
  const sessions: CalendarSession[] = [];
  for (const project of projects)
    for (const task of project.tasks)
      for (const step of task.subtasks)
        if (step.day === day && validTimeRange(step.startTime!, step.endTime!))
          sessions.push({
            project,
            task,
            step,
            start: timeToMinutes(step.startTime!),
            end: timeToMinutes(step.endTime!),
            column: 0,
            columns: 1,
          });
  sessions.sort(
    (a, b) =>
      a.start - b.start ||
      a.end - b.end ||
      (a.step.id < b.step.id ? -1 : a.step.id > b.step.id ? 1 : 0),
  );
  let group: CalendarSession[] = [],
    lanes: number[] = [],
    groupEnd = -1;
  const finishGroup = () => {
    for (const session of group) session.columns = lanes.length;
    group = [];
    lanes = [];
  };
  for (const session of sessions) {
    if (session.start >= groupEnd) finishGroup();
    let column = lanes.findIndex((end) => end <= session.start);
    if (column === -1) column = lanes.length;
    lanes[column] = session.end;
    session.column = column;
    group.push(session);
    groupEnd = Math.max(groupEnd, session.end);
  }
  finishGroup();
  return sessions;
}

export function rescheduleSession(
  projects: Project[],
  stepId: string,
  day: number,
  startMinutes: number,
): Project[] {
  if (
    !Number.isInteger(day) ||
    day < 0 ||
    day > 6 ||
    !Number.isInteger(startMinutes)
  )
    throw new Error("invalid-session-destination");
  const findStep = (input: Project[]) =>
    input
      .flatMap((project) => project.tasks.flatMap((task) => task.subtasks))
      .find((step) => step.id === stepId);
  const previous = findStep(projects);
  if (!previous || !validTimeRange(previous.startTime!, previous.endTime!))
    throw new Error("invalid-session");
  const duration =
    timeToMinutes(previous.endTime!) - timeToMinutes(previous.startTime!);
  const start = Math.max(0, Math.min(1439 - duration, startMinutes));
  const next =
    previous.day === day
      ? structuredClone(projects)
      : moveBoardCard(
          { id: "calendar", start: "1970-01-05", ended: false, projects },
          stepId,
          day,
        ).projects;
  const step = findStep(next)!;
  step.startTime = minutesToTime(start);
  step.endTime = minutesToTime(start + duration);
  return next;
}
