import { openDB, type DBSchema } from "idb";
import { taskDone, type Plan } from "../domain";
import type { ReminderSettings } from "./types";
export type { ReminderSettings } from "./types";

export const defaultReminderSettings = (): ReminderSettings => ({
  enabled: false,
  offsetsMinutes: [4320, 1440, 120],
  browserNotifications: false,
});
export interface DeadlineReminder {
  key: string;
  entityId: string;
  kind: "task" | "project";
  title: string;
  projectName?: string;
  deadline: string;
  deadlineAt: number;
  offsetMinutes: number;
  dueAt: number;
}
export interface ReminderItem {
  id: string;
  entityId: string;
  kind: "task" | "project";
  title: string;
  projectName?: string;
  deadline: string;
  deadlineAt: number;
  offsetsMinutes: number[];
  missed: boolean;
  createdAt: number;
}

/** Date-only deadlines end at 23:59 Vietnam time; no browser timezone inference. */
export function deadlineTimestamp(deadline: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d)?$/.test(deadline))
    return;
  const date = deadline.slice(0, 10);
  const dateStamp = Date.parse(date + "T12:00:00Z");
  if (
    !Number.isFinite(dateStamp) ||
    new Date(dateStamp).toISOString().slice(0, 10) !== date
  )
    return;
  const timestamp = Date.parse(
    (deadline.length === 10 ? deadline + "T23:59" : deadline) + ":00+07:00",
  );
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** All crossed milestones, including missed ones, grouped only by the consumer. */
export function listDeadlineReminders(
  plan: Plan,
  settings: ReminderSettings,
  now: number,
): DeadlineReminder[] {
  if (!settings.enabled || !Number.isFinite(now)) return [];
  const offsets = [...new Set(settings.offsetsMinutes)]
    .filter(
      (offset) =>
        Number.isSafeInteger(offset) && offset >= 0 && offset <= 525600,
    )
    .sort((a, b) => b - a);
  const result: DeadlineReminder[] = [];
  const seen = new Set<string>();
  const collect = (
    kind: DeadlineReminder["kind"],
    entityId: string,
    title: string,
    deadline: string | undefined,
    projectName?: string,
  ) => {
    if (!deadline) return;
    const deadlineAt = deadlineTimestamp(deadline);
    if (deadlineAt === undefined) return;
    for (const offsetMinutes of offsets) {
      const dueAt = deadlineAt - offsetMinutes * 60000;
      const key = `${kind}:${entityId}:${deadlineAt}:${offsetMinutes}`;
      if (dueAt > now || seen.has(key)) continue;
      seen.add(key);
      result.push({
        key,
        entityId,
        kind,
        title,
        ...(projectName ? { projectName } : {}),
        deadline,
        deadlineAt,
        offsetMinutes,
        dueAt,
      });
    }
  };
  for (const week of plan.weeks)
    for (const project of week.projects) {
      if (!(project.tasks.length && project.tasks.every(taskDone)))
        collect("project", project.id, project.name, project.deadline);
      for (const task of project.tasks)
        if (!taskDone(task))
          collect("task", task.id, task.name, task.deadline, project.name);
    }
  return result.sort((a, b) => a.dueAt - b.dueAt || a.key.localeCompare(b.key));
}

interface ReminderDatabase extends DBSchema {
  claims: {
    key: string;
    value: { key: string; uid: string };
    indexes: { uid: string };
  };
  inbox: {
    key: string;
    value: { key: string; uid: string; item: ReminderItem };
    indexes: { uid: string };
  };
}
let database: ReturnType<typeof openDB<ReminderDatabase>> | undefined;
function reminderDatabase() {
  database ??= openDB<ReminderDatabase>("weekdam-pro-reminders", 1, {
    upgrade(db) {
      db.createObjectStore("claims", { keyPath: "key" }).createIndex(
        "uid",
        "uid",
      );
      db.createObjectStore("inbox", { keyPath: "key" }).createIndex(
        "uid",
        "uid",
      );
    },
  });
  return database;
}
const scopedKey = (uid: string, key: string) => JSON.stringify([uid, key]);
const itemKey = (reminder: DeadlineReminder) =>
  `${reminder.kind}:${reminder.entityId}:${reminder.deadlineAt}`;
const sortItems = (items: ReminderItem[]) =>
  items.sort((a, b) => a.deadlineAt - b.deadlineAt || a.id.localeCompare(b.id));

export async function readReminderInbox(uid: string): Promise<ReminderItem[]> {
  if (!uid) return [];
  const db = await reminderDatabase();
  return sortItems(
    (await db.getAllFromIndex("inbox", "uid", uid)).map((row) => row.item),
  );
}

/** Keep existing inbox entries valid even after entitlement expires. Never claim
 * a new milestone or add an entry from this cleanup path. */
export async function pruneReminderInbox(
  uid: string,
  plan: Plan,
  settings: ReminderSettings,
  now: number,
): Promise<ReminderItem[]> {
  if (!uid) return [];
  const valid = new Map<string, DeadlineReminder[]>();
  for (const reminder of listDeadlineReminders(plan, settings, now)) {
    const key = itemKey(reminder);
    valid.set(key, [...(valid.get(key) ?? []), reminder]);
  }
  const db = await reminderDatabase();
  const transaction = db.transaction("inbox", "readwrite");
  const saved = await transaction.store.index("uid").getAll(uid);
  const items: ReminderItem[] = [];
  for (const row of saved) {
    const group = valid.get(row.item.id) ?? [];
    const offsetsMinutes = row.item.offsetsMinutes.filter((offset) =>
      group.some((m) => m.offsetMinutes === offset),
    );
    if (!offsetsMinutes.length) {
      await transaction.store.delete(row.key);
      continue;
    }
    const current = group[0];
    const item = { ...row.item, title: current.title, offsetsMinutes };
    if (current.projectName) item.projectName = current.projectName;
    else delete item.projectName;
    await transaction.store.put({ ...row, item });
    items.push(item);
  }
  await transaction.done;
  return sortItems(items);
}

/** A single readwrite IDB transaction elects one scanner across every same-device tab.
 * Claims survive inbox dismissal and reload; they are scoped to the signed-in UID.
 */
export async function scanDeadlineReminders(
  uid: string,
  plan: Plan,
  settings: ReminderSettings,
  now: number,
  reopened = false,
): Promise<{ items: ReminderItem[]; newItems: ReminderItem[] }> {
  if (!uid) return { items: [], newItems: [] };
  const candidates = listDeadlineReminders(plan, settings, now);
  const groups = new Map<string, DeadlineReminder[]>();
  for (const candidate of candidates) {
    const key = itemKey(candidate);
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }
  const db = await reminderDatabase();
  const transaction = db.transaction(["claims", "inbox"], "readwrite");
  const claimStore = transaction.objectStore("claims");
  const inboxStore = transaction.objectStore("inbox");
  const previous = await inboxStore.index("uid").getAll(uid);
  const inbox = new Map(previous.map((row) => [row.item.id, row.item]));
  for (const row of previous)
    if (!groups.has(row.item.id)) {
      await inboxStore.delete(row.key);
      inbox.delete(row.item.id);
    }
  const newItems: ReminderItem[] = [];
  for (const [key, group] of groups) {
    const newMilestones: DeadlineReminder[] = [];
    for (const milestone of group) {
      const claimKey = scopedKey(uid, milestone.key);
      if (!(await claimStore.get(claimKey))) {
        await claimStore.add({ key: claimKey, uid });
        newMilestones.push(milestone);
      }
    }
    const saved = inbox.get(key);
    if (!newMilestones.length && !saved) continue; // Dismissed milestones stay dismissed.
    const first = group[0];
    const item: ReminderItem = {
      id: key,
      entityId: first.entityId,
      kind: first.kind,
      title: first.title,
      ...(first.projectName ? { projectName: first.projectName } : {}),
      deadline: first.deadline,
      deadlineAt: first.deadlineAt,
      offsetsMinutes: group
        .map((milestone) => milestone.offsetMinutes)
        .sort((a, b) => b - a),
      missed: newMilestones.length
        ? reopened ||
          newMilestones.some((milestone) => now - milestone.dueAt > 60000)
        : saved!.missed,
      createdAt: saved?.createdAt ?? now,
    };
    await inboxStore.put({ key: scopedKey(uid, key), uid, item });
    inbox.set(key, item);
    if (newMilestones.length) newItems.push(item);
  }
  await transaction.done;
  return {
    items: sortItems([...inbox.values()]),
    newItems: sortItems(newItems),
  };
}

export async function dismissReminder(uid: string, id: string): Promise<void> {
  const db = await reminderDatabase();
  await db.delete("inbox", scopedKey(uid, id));
}
export async function clearReminderInbox(uid: string): Promise<void> {
  const db = await reminderDatabase();
  const transaction = db.transaction("inbox", "readwrite");
  for (const key of await transaction.store.index("uid").getAllKeys(uid))
    await transaction.store.delete(key);
  await transaction.done;
}
