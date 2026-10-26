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
import type { PomodoroSession } from "./pomodoro";
import type {
  PersonalTemplate,
  RecurrenceRule,
  ReminderSettings,
} from "./pro/types";
import { mergePomodoroSessions } from "./pomodoroHistory";
export interface CloudRecord {
  id: string;
  kind:
    | "week"
    | "project"
    | "task"
    | "subtask"
    | "pomodoroSession"
    | "proTemplate"
    | "recurrenceRule"
    | "proOperation"
    | "reminderSettings";
  parent: string;
  order: number;
  deleted: boolean;
  value: Record<string, unknown>;
}
export function normalizeForSync(plan: Plan): Plan {
  const result = clone(plan);
  for (const week of result.weeks) week.id = "week_" + week.start;
  const weekIds = new Set(result.weeks.map((week) => week.id));
  if (result.pomodoroSessions?.some((session) => weekIds.has(session.id)))
    throw new Error("invalid-id");
  const entities: { id: string }[] = [
    ...result.weeks.flatMap((week) =>
      week.projects.flatMap((project) => [
        project,
        ...project.tasks.flatMap((task) => [task, ...task.subtasks]),
      ]),
    ),
    ...(result.pro?.templates ?? []),
    ...(result.pro?.recurrenceRules ?? []),
  ];
  const used = new Set([
    ...weekIds,
    ...entities.map((entity) => entity.id),
    ...(result.pomodoroSessions ?? []).map((session) => session.id),
  ]);
  const remapped = new Map<string, string>();
  for (const entity of entities) {
    if (!weekIds.has(entity.id)) continue;
    const original = entity.id,
      stem = original.slice(0, 180) + ":sync";
    let next = stem,
      suffix = 0;
    while (used.has(next)) next = stem + ":" + ++suffix;
    used.add(next);
    remapped.set(original, next);
    entity.id = next;
  }
  for (const week of result.weeks)
    for (const project of week.projects)
      for (const task of project.tasks) {
        for (const entity of [task, ...task.subtasks])
          if (entity.source?.seriesId && remapped.has(entity.source.seriesId))
            entity.source.seriesId = remapped.get(entity.source.seriesId)!;
      }
  for (const session of result.pomodoroSessions ?? [])
    if (session.task && remapped.has(session.task.id))
      session.task.id = remapped.get(session.task.id)!;
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

// Rebase only the fields edited locally, so a stale tab cannot replace unrelated
// edits (including a renamed project whose order changed after another deletion).
export function rebasePlan(before: Plan, after: Plan, saved: Plan): Plan {
  const previous = new Map(encodeRecords(before).map((r) => [r.id, r]));
  const records = new Map(encodeRecords(saved).map((r) => [r.id, r]));
  const removed = new Map<string, CloudRecord>();
  for (const change of diffRecords(before, after)) {
    const old = previous.get(change.id);
    const stored = records.get(change.id);
    if (change.deleted) {
      if (stored) removed.set(change.id, stored);
      records.delete(change.id);
    } else if (!old || old.kind !== change.kind) records.set(change.id, change);
    else if (stored) {
      const merged = {
        ...change,
        parent: old.parent === change.parent ? stored.parent : change.parent,
        order: old.order === change.order ? stored.order : change.order,
        value: { ...stored.value },
      };
      for (const field of new Set([
        ...Object.keys(old.value),
        ...Object.keys(change.value),
      ])) {
        if (sameContent(old.value[field], change.value[field])) continue;
        if (field in change.value) merged.value[field] = change.value[field];
        else delete merged.value[field];
      }
      records.set(change.id, merged);
    }
    // An entity deleted in another tab stays deleted; editing a stale child
    // must not recreate its missing parent.
  }
  // A week/project removed from an old snapshot may now own new children.
  // Keep those children and their containers, rather than silently orphaning
  // them. A deletion based on the latest snapshot still removes the whole tree.
  for (const record of records.values()) {
    let parent = record.parent;
    while (parent && !records.has(parent)) {
      const container = removed.get(parent);
      if (!container) break;
      records.set(parent, container);
      parent = container.parent;
    }
  }
  return decodeRecords([...records.values()]);
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
  for (const session of plan.pomodoroSessions ?? [])
    add("pomodoroSession", "", 0, session.id, { ...session });
  for (const [index, template] of (plan.pro?.templates ?? []).entries())
    add("proTemplate", "", index, template.id, { ...template });
  for (const [index, rule] of (plan.pro?.recurrenceRules ?? []).entries())
    add("recurrenceRule", "", index, rule.id, { ...rule });
  // Older backups may use any valid document ID. Synthetic Pro documents must
  // never overwrite a planner entity that happens to use their preferred ID.
  const usedIds = new Set(records.map((record) => record.id));
  const syntheticId = (base: string) => {
    const stem = base.slice(0, 180);
    let candidate = stem,
      suffix = 0;
    while (usedIds.has(candidate)) candidate = stem + ":" + ++suffix;
    usedIds.add(candidate);
    return candidate;
  };
  for (const [index, operationId] of (
    plan.pro?.appliedOperations ?? []
  ).entries()) {
    const recordId = syntheticId("pro-op:" + operationId);
    add("proOperation", "", index, recordId, { id: recordId, operationId });
  }
  if (plan.pro?.reminders) {
    const recordId = syntheticId("pro-reminders");
    add("reminderSettings", "", 0, recordId, {
      id: recordId,
      ...plan.pro.reminders,
    });
  }
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
  const sessions = children("", "pomodoroSession").map(
    (record) => ({ ...record.value }) as unknown as PomodoroSession,
  );
  if (sessions.length)
    plan.pomodoroSessions = mergePomodoroSessions([], sessions);
  const templates = children("", "proTemplate").map(
    (r) => ({ ...r.value }) as unknown as PersonalTemplate,
  );
  const recurrenceRules = children("", "recurrenceRule").map(
    (r) => ({ ...r.value }) as unknown as RecurrenceRule,
  );
  const appliedOperations = children("", "proOperation").map(
    (r) => r.value.operationId as string,
  );
  const reminder = children("", "reminderSettings")[0];
  if (
    templates.length ||
    recurrenceRules.length ||
    appliedOperations.length ||
    reminder
  ) {
    plan.pro = {
      ...(templates.length ? { templates } : {}),
      ...(recurrenceRules.length ? { recurrenceRules } : {}),
      ...(appliedOperations.length ? { appliedOperations } : {}),
    };
    if (reminder) {
      const { id: _, ...settings } = reminder.value;
      plan.pro.reminders = settings as unknown as ReminderSettings;
    }
  }
  return plan;
}
