import {
  emptyPlan,
  clone,
  sameContent,
  type Plan,
  type Week,
  type Project,
  type Task,
  type Subtask,
} from "./domain";
export interface CloudRecord {
  id: string;
  kind: "week" | "project" | "task" | "subtask";
  parent: string;
  order: number;
  deleted: boolean;
  value: Record<string, unknown>;
}
export function normalizeForSync(plan: Plan): Plan {
  const result = clone(plan);
  for (const week of result.weeks) week.id = "week_" + week.start;
  return result;
}
export function diffRecords(before: Plan, after: Plan): CloudRecord[] {
  const previous = new Map(encodeRecords(before).map((r) => [r.id, r])),
    next = new Map(encodeRecords(after).map((r) => [r.id, r]));
  const changes: CloudRecord[] = [];
  for (const [key, record] of next)
    if (!sameContent(previous.get(key), record)) changes.push(record);
  for (const [key, record] of previous)
    if (!next.has(key))
      changes.push({ ...record, deleted: true, value: { id: key } });
  return changes;
}
export function encodeRecords(plan: Plan): CloudRecord[] {
  const records: CloudRecord[] = [];
  const add = (
    kind: CloudRecord["kind"],
    parent: string,
    order: number,
    id: string,
    value: Record<string, unknown>,
  ) =>
    records.push({
      id,
      kind,
      parent,
      order,
      deleted: false,
      value: JSON.parse(JSON.stringify(value)),
    });
  plan.weeks.forEach((w) => {
    const { projects, ...value } = w;
    add("week", "", 0, w.id, value);
    projects.forEach((p, pi) => {
      const { tasks, ...value } = p;
      add("project", w.id, pi, p.id, value);
      tasks.forEach((t, ti) => {
        const { subtasks, ...value } = t;
        add("task", p.id, ti, t.id, value);
        subtasks.forEach((s, si) => add("subtask", t.id, si, s.id, { ...s }));
      });
    });
  });
  return records;
}
export function decodeRecords(input: CloudRecord[]): Plan {
  const records = input
      .filter((r) => !r.deleted)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    plan = emptyPlan();
  const groups = new Map<string, CloudRecord[]>();
  for (const record of records) {
    const key = record.kind + ":" + record.parent;
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  const children = (parent: string, kind: CloudRecord["kind"]) =>
    groups.get(kind + ":" + parent) ?? [];
  for (const w of children("", "week")) {
    const week = { ...w.value, projects: [] } as unknown as Week;
    for (const p of children(w.id, "project")) {
      const project = { ...p.value, tasks: [] } as unknown as Project;
      for (const t of children(p.id, "task")) {
        const task = {
          ...t.value,
          subtasks: children(t.id, "subtask").map(
            (s) => ({ ...s.value }) as unknown as Subtask,
          ),
        } as unknown as Task;
        project.tasks.push(task);
      }
      week.projects.push(project);
    }
    plan.weeks.push(week);
  }
  plan.weeks.sort((a, b) => a.start.localeCompare(b.start));
  return plan;
}
