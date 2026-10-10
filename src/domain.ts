import {
  appendBoardProjects,
  assignCopiedDayOrder,
  validDayOrder,
  withoutDayOrder,
} from "./boardOrder";
export {
  dayCards,
  moveBoardCard,
  appendBoardProjects,
  placeEditedTask,
  preserveBoardOrder,
} from "./boardOrder";
export type { BoardAnchor, DayCard } from "./boardOrder";
export type Weight = 1 | 2 | 3;
export interface Subtask {
  id: string;
  day: number;
  weight: Weight;
  note: string;
  done: boolean;
  missed: number[];
  dayOrder?: number;
}
export interface Task {
  id: string;
  name: string;
  note: string;
  done: boolean;
  deadline?: string;
  subtasks: Subtask[];
}
export interface Project {
  id: string;
  name: string;
  deadline?: string;
  tasks: Task[];
}
export interface Week {
  id: string;
  start: string;
  ended: boolean;
  projects: Project[];
}
export interface Plan {
  version: 1;
  weeks: Week[];
}
export const emptyPlan = (): Plan => ({ version: 1, weeks: [] });
export const id = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export function sameContent(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [
                key,
                canonical((value as Record<string, unknown>)[key]),
              ]),
          )
        : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export const blankTask = (day?: number): Task => ({
  id: id(),
  name: "",
  note: "",
  done: false,
  subtasks:
    day === undefined
      ? []
      : [{ id: id(), day, weight: 1, note: "", done: false, missed: [] }],
});
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDate(day: string, amount: number): string {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function weekStart(day: string): string {
  return shiftDate(day, -((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7));
}
export function daysLeft(start: string, day: string): number {
  return Math.min(
    7,
    Math.max(
      0,
      Math.round(
        (Date.parse(shiftDate(start, 7)) - Date.parse(day)) / 86400000,
      ),
    ),
  );
}
export const weekAt = (plan: Plan, start: string): Week =>
  plan.weeks.find((w) => w.start === start) ?? {
    id: "week_" + start,
    start,
    ended: false,
    projects: [],
  };
export function replaceWeek(plan: Plan, week: Week): Plan {
  const weeks = plan.weeks.filter((w) => w.start !== week.start);
  weeks.push(week);
  return {
    ...plan,
    weeks: weeks.sort((a, b) => a.start.localeCompare(b.start)),
  };
}
export function progress(projects: Project[]) {
  let done = 0,
    total = 0;
  for (const p of projects)
    for (const t of p.tasks) {
      if (!t.subtasks.length) {
        total++;
        if (t.done) done++;
      } else
        for (const s of t.subtasks) {
          total += s.weight;
          if (s.done) done += s.weight;
        }
    }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
export function taskDone(task: Task): boolean {
  return task.subtasks.length ? task.subtasks.every((s) => s.done) : task.done;
}
export function copyProjects(projects: Project[], keep: boolean): Project[] {
  const copies = projects.map((p) => ({
    ...clone(p),
    id: id(),
    tasks: p.tasks.map((t) => ({
      ...clone(t),
      id: id(),
      done: keep ? t.done : false,
      subtasks: t.subtasks.map((s) => ({
        ...clone(s),
        id: id(),
        done: keep ? s.done : false,
        missed: keep ? [...s.missed] : [],
      })),
    })),
  }));
  return assignCopiedDayOrder(projects, copies);
}
export function endWeek(data: Plan, start: string, carry: boolean): Plan {
  let result = clone(data);
  const source = weekAt(result, start);
  if (source.ended) throw new Error("already-ended");
  source.ended = true;
  result = replaceWeek(result, source);
  if (carry) {
    const pending = source.projects
      .map((p) => ({
        ...p,
        tasks: p.tasks
          .filter((t) => !taskDone(t))
          .map((t) => ({ ...t, subtasks: t.subtasks.filter((s) => !s.done) })),
      }))
      .filter((p) => p.tasks.length);
    if (pending.length) {
      const next = weekAt(result, shiftDate(start, 7));
      if (next.ended) throw new Error("destination-ended");
      next.projects = appendBoardProjects(
        next.projects,
        copyProjects(pending, false),
      );
      result = replaceWeek(result, next);
    }
  }
  return result;
}
export function moveWeek(data: Plan, start: string, target: string): Plan {
  if (start === target || weekStart(target) !== target)
    throw new Error("invalid-destination");
  const next = weekAt(data, target);
  if (next.ended || next.projects.length)
    throw new Error("occupied-destination");
  const result = clone(data);
  const source = result.weeks.find((w) => w.start === start);
  if (!source || source.ended) throw new Error("cannot-move");
  source.start = target;
  return {
    ...result,
    weeks: result.weeks
      .filter((w) => w.id === source.id || w.start !== target)
      .sort((a, b) => a.start.localeCompare(b.start)),
  };
}
function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
function text(value: unknown, max = 10000): value is string {
  return typeof value === "string" && value.length <= max;
}
export function parseBackup(raw: string): Plan {
  if (raw.length > 5_000_000) throw new Error("backup-too-large");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("invalid-backup");
  const data = value as Plan,
    ids = new Set<string>(),
    starts = new Set<string>();
  const acceptId = (item: { id: string }) => {
    if (
      !text(item.id, 200) ||
      !item.id ||
      !/^[A-Za-z0-9_.:-]+$/.test(item.id) ||
      ids.has(item.id)
    )
      throw new Error("invalid-id");
    ids.add(item.id);
  };
  const deadline = (d?: string) =>
    d === undefined ||
    d === "" ||
    (typeof d === "string" &&
      validDate(d.slice(0, 10)) &&
      (d.length === 10 ||
        /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(d)));
  if (data.version !== 1 || !Array.isArray(data.weeks))
    throw new Error("invalid-version");
  for (const w of data.weeks) {
    if (
      !w ||
      !validDate(w.start) ||
      weekStart(w.start) !== w.start ||
      starts.has(w.start) ||
      typeof w.ended !== "boolean" ||
      !Array.isArray(w.projects)
    )
      throw new Error("invalid-week");
    starts.add(w.start);
    acceptId(w);
    for (const p of w.projects) {
      if (
        !p ||
        !text(p.name, 300) ||
        !p.name.trim() ||
        !Array.isArray(p.tasks) ||
        !deadline(p.deadline)
      )
        throw new Error("invalid-project");
      acceptId(p);
      for (const t of p.tasks) {
        if (
          !t ||
          !text(t.name, 500) ||
          !t.name.trim() ||
          !text(t.note) ||
          typeof t.done !== "boolean" ||
          !Array.isArray(t.subtasks) ||
          !deadline(t.deadline)
        )
          throw new Error("invalid-task");
        acceptId(t);
        for (const s of t.subtasks) {
          if (
            !s ||
            !Number.isInteger(s.day) ||
            s.day < 0 ||
            s.day > 6 ||
            ![1, 2, 3].includes(s.weight) ||
            !text(s.note) ||
            typeof s.done !== "boolean" ||
            !Array.isArray(s.missed) ||
            s.missed.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
            new Set(s.missed).size !== s.missed.length ||
            (s.dayOrder !== undefined && !validDayOrder(s.dayOrder))
          )
            throw new Error("invalid-subtask");
          acceptId(s);
        }
      }
    }
  }
  return clone(data);
}
export function mergePlans(local: Plan, incoming: Plan): Plan {
  const result = clone(local),
    projectIds = new Map(
      local.weeks.flatMap((w) => w.projects.map((p) => [p.id, p] as const)),
    );
  const used = new Set(
    local.weeks.flatMap((w) => [
      w.id,
      ...w.projects.flatMap((p) => [
        p.id,
        ...p.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]),
      ]),
    ]),
  );
  for (const source of incoming.weeks) {
    let target = result.weeks.find((w) => w.start === source.start);
    if (!target) {
      target = {
        ...clone(source),
        id: used.has(source.id) ? id() : source.id,
        projects: [],
      };
      result.weeks.push(target);
    }
    const addedSources: Project[] = [],
      addedCopies: Project[] = [];
    for (const project of source.projects) {
      const same = projectIds.get(project.id);
      if (same && sameContent(withoutDayOrder(same), withoutDayOrder(project)))
        continue;
      const entities = [
        project.id,
        ...project.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]),
      ];
      const copy = entities.some((key) => used.has(key))
        ? copyProjects([project], true)[0]
        : clone(project);
      addedSources.push(project);
      addedCopies.push(copy);
      for (const key of [
        copy.id,
        ...copy.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]),
      ])
        used.add(key);
    }
    if (addedCopies.length)
      target.projects = appendBoardProjects(
        target.projects,
        assignCopiedDayOrder(addedSources, addedCopies),
      );
  }
  return {
    ...result,
    weeks: result.weeks.sort((a, b) => a.start.localeCompare(b.start)),
  };
}
export function statistics(data: Plan) {
  const ended = data.weeks
    .filter((w) => w.ended)
    .sort((a, b) => b.start.localeCompare(a.start));
  const count = ended.map((w) => ({ week: w, ...progress(w.projects) }));
  const done = count.reduce((n, w) => n + w.done, 0),
    total = count.reduce((n, w) => n + w.total, 0);
  const best = [...count]
    .filter((w) => w.total)
    .sort(
      (a, b) =>
        b.done / b.total - a.done / a.total ||
        b.week.start.localeCompare(a.week.start),
    )[0]?.week;
  let streak = 0;
  for (let i = 0; i < count.length; i++) {
    const w = count[i];
    if (
      !w.total ||
      w.done / w.total < 0.5 ||
      (i > 0 && shiftDate(count[i - 1].week.start, -7) !== w.week.start)
    )
      break;
    streak++;
  }
  const plannedDays = Array<number>(7).fill(0),
    doneDays = Array<number>(7).fill(0),
    activity: Record<string, number> = {};
  for (const w of ended)
    for (const p of w.projects)
      for (const t of p.tasks)
        for (const s of t.subtasks) {
          plannedDays[s.day] += s.weight;
          for (const d of s.missed) if (d !== s.day) plannedDays[d] += s.weight;
          if (s.done) {
            doneDays[s.day] += s.weight;
            const day = shiftDate(w.start, s.day);
            activity[day] = (activity[day] ?? 0) + s.weight;
          }
        }
  const scheduledDone = doneDays.reduce((a, b) => a + b, 0);
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    best,
    streak,
    count,
    plannedDays,
    doneDays,
    scheduledDone,
    activity,
  };
}
