import type { Project, Subtask, Task, Week } from "./domain";

export const MAX_DAY_ORDER = 1_000_000_000;
const GAP = 1024;
const MIN_GAP = 1e-6;
export interface DayCard {
  project: Project;
  task: Task;
  step: Subtask;
}
export interface BoardAnchor {
  id: string;
  edge: "before" | "after";
}
export const validDayOrder = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= MAX_DAY_ORDER;

function cards(projects: Project[]): DayCard[] {
  return projects.flatMap((project) =>
    project.tasks.flatMap((task) =>
      task.subtasks.map((step) => ({ project, task, step })),
    ),
  );
}
export function dayCards(projects: Project[], day: number): DayCard[] {
  return cards(projects)
    .filter((row) => row.step.day === day)
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const ar = a.row.step.dayOrder,
        br = b.row.step.dayOrder;
      if (ar === undefined && br === undefined) return a.index - b.index;
      if (ar === undefined) return 1;
      if (br === undefined) return -1;
      return (
        ar - br ||
        (a.row.step.id < b.row.step.id
          ? -1
          : a.row.step.id > b.row.step.id
            ? 1
            : 0)
      );
    })
    .map((item) => item.row);
}
function normalize(rows: DayCard[]) {
  const spacing = Math.min(GAP, MAX_DAY_ORDER / (rows.length + 2));
  rows.forEach((row, index) => {
    row.step.dayOrder = (index + 1) * spacing;
  });
}
function append(rows: DayCard[], incoming: DayCard[]) {
  if (!incoming.length) return;
  if (rows.some((row) => !validDayOrder(row.step.dayOrder))) normalize(rows);
  const last = rows.at(-1)?.step.dayOrder ?? 0;
  if (last + GAP * incoming.length > MAX_DAY_ORDER) {
    normalize([...rows, ...incoming]);
  } else {
    incoming.forEach((row, index) => {
      row.step.dayOrder = last + GAP * (index + 1);
    });
  }
}

export function moveBoardCard(
  week: Week,
  stepId: string,
  toDay: number,
  anchor?: BoardAnchor,
  markMissed = false,
): Week {
  if (week.ended || !Number.isInteger(toDay) || toDay < 0 || toDay > 6)
    return week;
  const next = structuredClone(week);
  const row = cards(next.projects).find((item) => item.step.id === stepId);
  if (!row) return week;
  const target = dayCards(next.projects, toDay).filter(
    (item) => item.step.id !== stepId,
  );
  let index = target.length;
  if (anchor) {
    if (anchor.edge !== "before" && anchor.edge !== "after") return week;
    const found = target.findIndex((item) => item.step.id === anchor.id);
    if (found < 0) return week;
    index = found + (anchor.edge === "after" ? 1 : 0);
  }
  const desired = [...target.slice(0, index), row, ...target.slice(index)];
  if (
    row.step.day === toDay &&
    JSON.stringify(desired.map((item) => item.step.id)) ===
      JSON.stringify(dayCards(week.projects, toDay).map((item) => item.step.id))
  )
    return week;
  if (target.some((item) => !validDayOrder(item.step.dayOrder)))
    normalize(target);
  const rank = () => {
    const previous = target[index - 1]?.step.dayOrder ?? 0;
    const following = target[index]?.step.dayOrder ?? previous + GAP * 2;
    return { value: (previous + following) / 2, gap: following - previous };
  };
  let placement = rank();
  if (placement.gap <= MIN_GAP || !validDayOrder(placement.value)) {
    normalize(target);
    placement = rank();
  }
  const oldDay = row.step.day;
  if (markMissed && oldDay !== toDay && !row.step.missed.includes(oldDay))
    row.step.missed.push(oldDay);
  row.step.missed = row.step.missed.filter((day) => day !== toDay);
  row.step.day = toDay;
  row.step.dayOrder = placement.value;
  return next;
}

export function assignCopiedDayOrder(
  source: Project[],
  copies: Project[],
): Project[] {
  const copiedSteps = new Map<string, Subtask>();
  source.forEach((project, pi) =>
    project.tasks.forEach((task, ti) =>
      task.subtasks.forEach((step, si) =>
        copiedSteps.set(step.id, copies[pi].tasks[ti].subtasks[si]),
      ),
    ),
  );
  for (let day = 0; day < 7; day++) {
    dayCards(source, day).forEach((row, index) => {
      copiedSteps.get(row.step.id)!.dayOrder = (index + 1) * GAP;
    });
  }
  return copies;
}
export function appendBoardProjects(
  current: Project[],
  incoming: Project[],
): Project[] {
  const existing = structuredClone(current),
    added = structuredClone(incoming);
  for (let day = 0; day < 7; day++)
    append(dayCards(existing, day), dayCards(added, day));
  return [...existing, ...added];
}
export function placeEditedTask(
  before: Project[],
  after: Project[],
  taskId: string,
): Project[] {
  const next = structuredClone(after);
  const previous = new Map(
    cards(before)
      .filter((row) => row.task.id === taskId)
      .map((row) => [row.step.id, row.step]),
  );
  const edited = cards(next).filter((row) => row.task.id === taskId);
  const relocated = new Set<string>();
  for (const row of edited) {
    const old = previous.get(row.step.id);
    if (!old || old.day !== row.step.day) {
      delete row.step.dayOrder;
      relocated.add(row.step.id);
    } else if (old.dayOrder === undefined) delete row.step.dayOrder;
    else row.step.dayOrder = old.dayOrder;
  }
  preserveInPlace(before, next);
  for (let day = 0; day < 7; day++) {
    const incoming = edited.filter(
      (row) => row.step.day === day && relocated.has(row.step.id),
    );
    const existing = dayCards(next, day).filter(
      (row) => !relocated.has(row.step.id),
    );
    append(existing, incoming);
  }
  return next;
}
export function withoutDayOrder(project: Project): Project {
  const copy = structuredClone(project);
  for (const task of copy.tasks)
    for (const step of task.subtasks) delete step.dayOrder;
  return copy;
}
function preserveInPlace(before: Project[], after: Project[]) {
  for (let day = 0; day < 7; day++) {
    const current = dayCards(after, day);
    const byId = new Map(current.map((row) => [row.step.id, row]));
    const previous = dayCards(before, day).filter((row) =>
      byId.has(row.step.id),
    );
    const previousIds = new Set(previous.map((row) => row.step.id));
    const remaining = current.filter((row) => previousIds.has(row.step.id));
    if (
      JSON.stringify(previous.map((row) => row.step.id)) !==
      JSON.stringify(remaining.map((row) => row.step.id))
    )
      normalize(previous.map((row) => byId.get(row.step.id)!));
  }
}
export function preserveBoardOrder(
  before: Project[],
  after: Project[],
): Project[] {
  const next = structuredClone(after);
  preserveInPlace(before, next);
  return next;
}
