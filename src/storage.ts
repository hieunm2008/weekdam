import { openDB } from "idb";
import { emptyPlan, parseBackup, type Plan } from "./domain";
import type { CloudRecord } from "./records";
import {
  initialPomodoroRuntime,
  reducePomodoro,
  type PomodoroAction,
  type PomodoroResult,
  type PomodoroRuntime,
  type PomodoroSession,
} from "./pomodoro";
import { mergePomodoroSessions } from "./pomodoroHistory";
export interface PendingChange {
  revision: string;
  record: CloudRecord;
}
export interface AccountState {
  plan: Plan;
  pending: PendingChange[];
  migrated: boolean;
}
const database = () =>
  openDB("weekdam-local", 2, {
    upgrade(db) {
      for (const name of ["plans", "outbox", "meta"])
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    },
  });
function mergeHistory(existing: Plan | undefined, incoming: Plan): Plan {
  if (
    existing?.pomodoroSessions === undefined &&
    incoming.pomodoroSessions === undefined
  )
    return incoming;
  return {
    ...incoming,
    pomodoroSessions: mergePomodoroSessions(
      existing?.pomodoroSessions,
      incoming.pomodoroSessions,
    ),
  };
}
export async function loadPlan(key: string): Promise<Plan> {
  const db = await database();
  try {
    const data = await db.get("plans", key);
    return data ? parseBackup(JSON.stringify(data)) : emptyPlan();
  } finally {
    db.close();
  }
}
export async function savePlan(key: string, plan: Plan): Promise<void> {
  const db = await database();
  try {
    const tx = db.transaction("plans", "readwrite");
    const existing: Plan | undefined = await tx.store.get(key);
    await tx.store.put(mergeHistory(existing, plan), key);
    await tx.done;
  } finally {
    db.close();
  }
}
export async function loadAccount(key: string): Promise<AccountState> {
  const db = await database();
  try {
    const tx = db.transaction(["plans", "outbox", "meta"]);
    const [plan, pending, migrated] = await Promise.all([
      tx.objectStore("plans").get(key),
      tx.objectStore("outbox").get(key),
      tx.objectStore("meta").get(key),
    ]);
    await tx.done;
    return {
      plan: plan ? parseBackup(JSON.stringify(plan)) : emptyPlan(),
      pending: pending ?? [],
      migrated: migrated === true,
    };
  } finally {
    db.close();
  }
}
export async function saveAccount(
  key: string,
  plan: Plan,
  changes: PendingChange[],
  migrated?: boolean,
): Promise<void> {
  const db = await database();
  try {
    const tx = db.transaction(["plans", "outbox", "meta"], "readwrite");
    const [existingPlan, storedPending] = await Promise.all([
      tx.objectStore("plans").get(key),
      tx.objectStore("outbox").get(key),
    ]);
    const next = mergeHistory(existingPlan, plan);
    const existing: PendingChange[] = storedPending ?? [];
    const pending = new Map(existing.map((p) => [p.record.id, p]));
    for (const change of changes) {
      if (change.record.kind === "pomodoroSession") {
        if (change.record.deleted) continue;
        const session = next.pomodoroSessions?.find(
          (s) => s.id === change.record.id,
        );
        if (!session || pending.has(change.record.id)) continue;
        pending.set(change.record.id, {
          ...change,
          record: { ...change.record, value: { ...session } },
        });
      } else pending.set(change.record.id, change);
    }
    await Promise.all([
      tx.objectStore("plans").put(next, key),
      tx.objectStore("outbox").put([...pending.values()], key),
      ...(migrated === undefined
        ? []
        : [tx.objectStore("meta").put(migrated, key)]),
    ]);
    await tx.done;
  } finally {
    db.close();
  }
}

export async function loadPomodoroRuntime(
  scope: string,
): Promise<PomodoroRuntime> {
  const db = await database();
  try {
    return (
      (await db.get("meta", "pomodoro:" + scope)) ?? initialPomodoroRuntime()
    );
  } finally {
    db.close();
  }
}

export async function claimPomodoroChime(
  scope: string,
  revision: number,
): Promise<boolean> {
  const db = await database();
  const tx = db.transaction("meta", "readwrite");
  try {
    const runtime: PomodoroRuntime | undefined = await tx.store.get(
      "pomodoro:" + scope,
    );
    const key = "pomodoro-chime:" + scope;
    const consumed: number = (await tx.store.get(key)) ?? 0;
    const claimed = Boolean(
      runtime?.settings.sound &&
      runtime.completionRevision === revision &&
      revision > consumed,
    );
    if (claimed) await tx.store.put(revision, key);
    await tx.done;
    return claimed;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* The transaction may already be aborted. */
    }
    await tx.done.catch(() => {});
    throw error;
  } finally {
    db.close();
  }
}

export async function loadPomodoroHistory(scope: string): Promise<{
  sessions: PomodoroSession[];
  pending: PendingChange[];
}> {
  const account = await loadAccount(scope);
  return {
    sessions: account.plan.pomodoroSessions ?? [],
    pending: account.pending.filter((p) => p.record.kind === "pomodoroSession"),
  };
}

export async function dispatchPomodoroAction(
  scope: string,
  action: PomodoroAction,
): Promise<PomodoroResult> {
  const db = await database();
  const tx = db.transaction(["plans", "outbox", "meta"], "readwrite");
  try {
    const runtimeKey = "pomodoro:" + scope;
    const runtime: PomodoroRuntime =
      (await tx.objectStore("meta").get(runtimeKey)) ??
      initialPomodoroRuntime();
    const assignedAction =
      action.type === "start" || action.type === "next"
        ? { ...action, sessionId: action.sessionId ?? crypto.randomUUID() }
        : action;
    const result = reducePomodoro(runtime, assignedAction, Date.now());
    if (result.changed) {
      await tx.objectStore("meta").put(result.runtime, runtimeKey);
      if (result.session) {
        const stored: Plan =
          (await tx.objectStore("plans").get(scope)) ?? emptyPlan();
        const existed = stored.pomodoroSessions?.some(
          (s) => s.id === result.session!.id,
        );
        await tx.objectStore("plans").put(
          {
            ...stored,
            pomodoroSessions: mergePomodoroSessions(stored.pomodoroSessions, [
              result.session,
            ]),
          },
          scope,
        );
        if (!existed && scope.startsWith("account:")) {
          const pending: PendingChange[] =
            (await tx.objectStore("outbox").get(scope)) ?? [];
          const record: CloudRecord = {
            id: result.session.id,
            kind: "pomodoroSession",
            parent: "",
            order: 0,
            deleted: false,
            value: { ...result.session },
          };
          await tx
            .objectStore("outbox")
            .put(
              [...pending, { revision: crypto.randomUUID(), record }],
              scope,
            );
        }
      }
    }
    await tx.done;
    return result;
  } catch (error) {
    // A synchronous put failure does not abort pending IndexedDB writes on its own.
    try {
      tx.abort();
    } catch {
      /* The request may already have aborted the transaction. */
    }
    await tx.done.catch(() => {});
    throw error;
  } finally {
    db.close();
  }
}
export async function acknowledge(
  key: string,
  changes: PendingChange[],
): Promise<void> {
  const db = await database();
  try {
    const tx = db.transaction("outbox", "readwrite");
    const existing: PendingChange[] = (await tx.store.get(key)) ?? [];
    const acknowledged = new Map(changes.map((p) => [p.record.id, p.revision]));
    await tx.store.put(
      existing.filter((p) => acknowledged.get(p.record.id) !== p.revision),
      key,
    );
    await tx.done;
  } finally {
    db.close();
  }
}
