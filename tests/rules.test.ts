import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import * as firestoreModule from "firebase/firestore";
import type { FirebaseClient } from "../src/firebaseClient";
import { createFirebaseBillingRepository } from "../src/pro/useBilling";
import { encodeRecords } from "../src/records";
let env: RulesTestEnvironment;
const record = () => ({
  id: "p-study",
  kind: "project",
  parent: "week_2026-10-05",
  order: 0,
  deleted: false,
  value: { id: "p-study", name: "Study" },
  updatedAt: serverTimestamp(),
});
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-weekdam-pro",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
});
afterAll(async () => {
  await env?.cleanup();
});
it("lets the owner read, create, edit and tombstone records", async () => {
  const db = env.authenticatedContext("owner").firestore(),
    ref = doc(db, "users/owner/records/p-study");
  await assertSucceeds(setDoc(ref, record()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(db, "users/owner/records")));
  await assertSucceeds(
    setDoc(ref, { ...record(), value: { id: "p-study", name: "Changed" } }),
  );
  await assertSucceeds(
    setDoc(ref, { ...record(), deleted: true, value: { id: "p-study" } }),
  );
  expect((await getDoc(ref)).data()?.deleted).toBe(true);
});
it("denies unauthenticated clients and cross-account reads/writes", async () => {
  await env.withSecurityRulesDisabled(async (context) =>
    setDoc(doc(context.firestore(), "users/owner/records/p-study"), record()),
  );
  for (const db of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext("other").firestore(),
  ]) {
    await assertFails(getDoc(doc(db, "users/owner/records/p-study")));
    await assertFails(getDocs(collection(db, "users/owner/records")));
    await assertFails(setDoc(doc(db, "users/owner/records/p-study"), record()));
  }
});
it("rejects unexpected fields, invalid values, forged IDs and client timestamps", async () => {
  const db = env.authenticatedContext("owner").firestore(),
    ref = doc(db, "users/owner/records/p-study");
  await assertFails(setDoc(ref, { ...record(), admin: true }));
  await assertFails(setDoc(ref, { ...record(), id: "wrong" }));
  await assertFails(
    setDoc(ref, { ...record(), updatedAt: new Date("2020-01-01") }),
  );
  await assertFails(
    setDoc(ref, {
      ...record(),
      kind: "subtask",
      value: {
        id: "p-study",
        day: 10,
        weight: 4,
        note: "",
        done: false,
        missed: [],
      },
    }),
  );
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(doc(db, "public/p-study"), record()));
});
it("accepts legacy and fractional day order while rejecting malformed placement ranks", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const ref = doc(db, "users/owner/records/p-study");
  const value = {
    id: "p-study",
    day: 0,
    weight: 1,
    note: "",
    done: false,
    missed: [],
  };
  const subtask = { ...record(), kind: "subtask", parent: "t-study", value };
  await assertSucceeds(setDoc(ref, subtask));
  await assertSucceeds(
    setDoc(ref, { ...subtask, value: { ...value, dayOrder: 1024.5 } }),
  );
  for (const dayOrder of [-1, 1_000_000_001, NaN, Infinity, "bad", null]) {
    await assertFails(
      setDoc(ref, { ...subtask, value: { ...value, dayOrder } }),
    );
  }
  await assertFails(
    setDoc(ref, {
      ...subtask,
      value: { ...value, dayOrder: 4, privateOrder: 2 },
    }),
  );
});

it("accepts complete same-day session times and rejects partial or malformed ranges", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const ref = doc(db, "users/owner/records/p-study");
  const value = {
    id: "p-study",
    day: 0,
    weight: 2,
    note: "",
    done: false,
    missed: [],
  };
  const subtask = { ...record(), kind: "subtask", parent: "t-study", value };
  await assertSucceeds(setDoc(ref, subtask));
  for (const [startTime, endTime] of [
    ["00:00", "23:59"],
    ["09:00", "10:30"],
    ["09:00", "09:01"],
  ])
    await assertSucceeds(
      setDoc(ref, { ...subtask, value: { ...value, startTime, endTime } }),
    );
  for (const times of [
    { startTime: "09:00" },
    { endTime: "10:00" },
    { startTime: "", endTime: "" },
    { startTime: "9:00", endTime: "10:00" },
    { startTime: "09:00", endTime: "09:00" },
    { startTime: "11:00", endTime: "10:00" },
    { startTime: "23:00", endTime: "00:30" },
    { startTime: "23:00", endTime: "24:00" },
    { startTime: "09:00", endTime: 600 },
    { startTime: "09:00", endTime: "10:00", duration: 60 },
  ])
    await assertFails(
      setDoc(ref, { ...subtask, value: { ...value, ...times } }),
    );
});

const pomodoroRecord = () => ({
  id: "pomodoro_focus",
  kind: "pomodoroSession",
  parent: "",
  order: 0,
  deleted: false,
  value: {
    id: "pomodoro_focus",
    startedAt: 1_000,
    endedAt: 61_000,
    plannedDurationMs: 60_000,
    focusedDurationMs: 60_000,
    outcome: "completed",
    task: { id: "deleted-task", name: "Study", projectName: "Math" },
  },
  updatedAt: serverTimestamp(),
});

it("accepts owner Pomodoro history even when the linked task no longer exists", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const ref = doc(db, "users/owner/records/pomodoro_focus");
  const completed = pomodoroRecord();
  await assertSucceeds(setDoc(ref, completed));
  await assertSucceeds(
    setDoc(ref, {
      ...completed,
      value: {
        ...completed.value,
        focusedDurationMs: 10_000,
        outcome: "stopped",
      },
    }),
  );
  await assertSucceeds(getDoc(ref));
});

it("rejects invalid Pomodoro durations, outcomes, timestamps and snapshots", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const ref = doc(db, "users/owner/records/pomodoro_focus");
  const record = pomodoroRecord();
  for (const invalid of [
    { startedAt: -1 },
    { endedAt: 999 },
    { plannedDurationMs: 0 },
    { plannedDurationMs: 1.5 },
    { focusedDurationMs: -1 },
    { focusedDurationMs: 60_001 },
    { focusedDurationMs: 59_999 },
    { outcome: "stopped" },
    { outcome: "unknown" },
    { unexpected: true },
    { task: { id: "bad/path", name: "Study", projectName: "Math" } },
    { task: { id: "task", name: "", projectName: "Math" } },
    { task: { id: "task", name: "Study" } },
    { task: { id: "task", name: "Study", projectName: "Math", done: true } },
  ]) {
    await assertFails(
      setDoc(ref, { ...record, value: { ...record.value, ...invalid } }),
    );
  }
  await assertFails(setDoc(ref, { ...record, parent: "task" }));
});

it("accepts the Pomodoro Date boundary and rejects timestamps beyond it", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const ref = doc(db, "users/owner/records/pomodoro_focus");
  const record = pomodoroRecord();
  const maxDateTimestamp = 8_640_000_000_000_000;
  await assertSucceeds(
    setDoc(ref, {
      ...record,
      value: {
        ...record.value,
        startedAt: maxDateTimestamp - 60_000,
        endedAt: maxDateTimestamp,
      },
    }),
  );
  await assertSucceeds(
    setDoc(ref, {
      ...record,
      value: {
        ...record.value,
        plannedDurationMs: Number.MAX_SAFE_INTEGER,
        focusedDurationMs: Number.MAX_SAFE_INTEGER,
      },
    }),
  );
  for (const times of [
    { startedAt: 1_000, endedAt: maxDateTimestamp + 1 },
    { startedAt: maxDateTimestamp + 1, endedAt: maxDateTimestamp + 60_001 },
    { startedAt: 1_000, endedAt: Number.MAX_SAFE_INTEGER },
    {
      startedAt: Number.MAX_SAFE_INTEGER - 60_000,
      endedAt: Number.MAX_SAFE_INTEGER,
    },
  ])
    await assertFails(
      setDoc(ref, { ...record, value: { ...record.value, ...times } }),
    );
});

it("keeps Pomodoro history isolated from guests and other accounts", async () => {
  const record = pomodoroRecord();
  await env.withSecurityRulesDisabled(async (context) =>
    setDoc(
      doc(context.firestore(), "users/owner/records/pomodoro_focus"),
      record,
    ),
  );
  for (const db of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext("other").firestore(),
  ]) {
    const ref = doc(db, "users/owner/records/pomodoro_focus");
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, record));
  }
});

const billingDocument = () => ({
  demo: true, uid: "owner", status: "trial", plan: null,
  trialUsed: true, trialStartedAt: 1000, expiresAt: 604801000, updatedAt: 1000,
  committedAt: serverTimestamp(),
});
const receiptDocument = () => ({
  demo: true, uid: "owner", checkoutId: "demo_trial", kind: "trial", plan: "month", outcome: "success",
  amountVnd: 0, createdAt: 1000, previousExpiresAt: 0, expiresAt: 604801000,
  committedAt: serverTimestamp(),
});
it("lets only the owner manage demo billing and create immutable simulated receipts", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const billing = doc(db, "users/owner/demoBilling/current");
  const receipt = doc(db, "users/owner/demoReceipts/demo_trial");
  await assertSucceeds(setDoc(billing, billingDocument()));
  await assertSucceeds(setDoc(receipt, receiptDocument()));
  await assertSucceeds(getDoc(billing));
  await assertSucceeds(getDocs(collection(db, "users/owner/demoReceipts")));
  await assertFails(setDoc(receipt, receiptDocument()));
  await assertFails(deleteDoc(receipt));
  await assertFails(deleteDoc(billing));
  for (const other of [env.unauthenticatedContext().firestore(), env.authenticatedContext("other").firestore()]) {
    await assertFails(getDoc(doc(other, "users/owner/demoBilling/current")));
    await assertFails(getDoc(doc(other, "users/owner/demoReceipts/demo_trial")));
    await assertFails(setDoc(doc(other, "users/owner/demoBilling/current"), billingDocument()));
    await assertFails(setDoc(doc(other, "users/owner/demoReceipts/other"), { ...receiptDocument(), checkoutId: "other" }));
  }
});
it("prevents resetting trial use, forged ownership and malformed demo documents", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const billing = doc(db, "users/owner/demoBilling/current");
  await assertSucceeds(setDoc(billing, billingDocument()));
  await assertFails(setDoc(billing, { ...billingDocument(), status: "free", trialUsed: false, trialStartedAt: null, expiresAt: 0 }));
  await assertFails(setDoc(billing, { ...billingDocument(), trialStartedAt: 2000, expiresAt: 604802000 }));
  for (const invalid of [{ uid: "other" }, { demo: false }, { expiresAt: -1 }, { unexpected: true }, { committedAt: new Date(0) }])
    await assertFails(setDoc(billing, { ...billingDocument(), ...invalid }));
  await assertFails(setDoc(doc(db, "users/owner/demoBilling/extra"), billingDocument()));
  await assertFails(setDoc(doc(db, "users/owner/demoReceipts/fake"), { ...receiptDocument(), checkoutId: "mismatch" }));
  await assertFails(setDoc(doc(db, "users/owner/demoReceipts/fake"), { ...receiptDocument(), checkoutId: "fake", kind: "trial" }));
});
it("records successful, failed and cancelled demo checkouts without payment details", async () => {
  const db = env.authenticatedContext("owner").firestore();
  for (const outcome of ["success", "failed", "cancelled"]) {
    const ref = doc(db, `users/owner/demoReceipts/${outcome}`);
    const receipt = { ...receiptDocument(), checkoutId: outcome, kind: "checkout", plan: "year", amountVnd: 249000, outcome };
    await assertSucceeds(setDoc(ref, receipt));
    await assertFails(setDoc(doc(db, `users/owner/demoReceipts/${outcome}-bad`), { ...receipt, checkoutId: `${outcome}-bad`, cardNumber: "4111" }));
  }
});

it("accepts the Pro planning record kinds and generated task metadata", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const source = { kind: "recurrence", operationId: "generate-1", seriesId: "series-1", occurrenceDate: "2026-10-23", detached: true };
  const values = [
    { kind: "proTemplate", id: "template-1", value: { id: "template-1", name: "Revision", sourceWeek: "2026-10-19", projects: [] } },
    { kind: "recurrenceRule", id: "series-1", value: { id: "series-1", operationId: "generate-1", name: "Study", note: "", weight: 2, days: [0, 2], startTime: "08:00", endTime: "09:00", startDate: "2026-10-23", endDate: "2026-12-31" } },
    { kind: "proOperation", id: "pro-op:generate-1", value: { id: "pro-op:generate-1", operationId: "generate-1" } },
    { kind: "reminderSettings", id: "pro-reminders", value: { id: "pro-reminders", enabled: true, offsetsMinutes: [4320, 1440, 120], browserNotifications: false } },
  ];
  for (const entry of values)
    await assertSucceeds(setDoc(doc(db, "users", "owner", "records", entry.id), { ...record(), ...entry, parent: "" }));
  for (const entry of values.filter(value => ["proOperation", "reminderSettings"].includes(value.kind))) {
    const id = entry.id + ":1";
    await assertSucceeds(setDoc(doc(db, "users", "owner", "records", id), { ...record(), ...entry, id, value: { ...entry.value, id }, parent: "" }));
  }
  await assertSucceeds(setDoc(doc(db, "users/owner/records/task-source"), { ...record(), id: "task-source", kind: "task", parent: "p-study", value: { id: "task-source", name: "Study", note: "", done: false, source } }));
  await assertSucceeds(setDoc(doc(db, "users/owner/records/session-source"), { ...record(), id: "session-source", kind: "subtask", parent: "task-source", value: { id: "session-source", day: 4, weight: 2, note: "", done: false, missed: [], startTime: "08:00", endTime: "09:00", source } }));
  await assertFails(setDoc(doc(db, "users/owner/records/task-source"), { ...record(), id: "task-source", kind: "task", parent: "p-study", value: { id: "task-source", name: "Study", note: "", done: false, source: { ...source, kind: "paid" } } }));
});

it("commits idempotent billing transactions and syncs receipt state to another device", async () => {
  const makeRepository = () => {
    const db = env.authenticatedContext("owner").firestore();
    return createFirebaseBillingRepository({ auth: { currentUser: { uid: "owner" } }, getDatabase: async () => ({ db, firestore: firestoreModule }) } as unknown as FirebaseClient);
  };
  const first = makeRepository();
  const second = makeRepository();
  const now = Date.parse("2026-01-31T23:30:00+07:00");
  const input = { uid: "owner", checkoutId: "repeat-safely", kind: "checkout" as const, plan: "month" as const, outcome: "success" as const, now };
  const [one, two] = await Promise.all([first.mutate("owner", input), second.mutate("owner", input)]);
  expect(one.billing?.expiresAt).toBe(Date.parse("2026-02-28T23:30:00+07:00"));
  expect(two.billing?.expiresAt).toBe(one.billing?.expiresAt);
  const db = env.authenticatedContext("owner").firestore();
  expect((await getDocs(collection(db, "users/owner/demoReceipts"))).size).toBe(1);
  const watched = await new Promise<{ expiresAt: number; count: number }>((resolve, reject) => {
    const stop = second.watch("owner", (billing, receipts, confirmed) => {
      if (confirmed && billing && receipts.length) {
        stop(); resolve({ expiresAt: billing.expiresAt, count: receipts.length });
      }
    }, reject);
  });
  expect(watched).toEqual({ expiresAt: one.billing!.expiresAt, count: 1 });
  const failed = { ...input, checkoutId: "failure-immutable", outcome: "failed" as const };
  await first.mutate("owner", failed);
  const retry = await second.mutate("owner", { ...failed, outcome: "success" });
  expect(retry.receipt.outcome).toBe("failed");
  expect(retry.billing?.expiresAt).toBe(one.billing?.expiresAt);
});

it("atomically allows a seven-day trial once even with two simultaneous clients", async () => {
  const makeRepository = () => createFirebaseBillingRepository({ auth: { currentUser: { uid: "owner" } }, getDatabase: async () => ({ db: env.authenticatedContext("owner").firestore(), firestore: firestoreModule }) } as unknown as FirebaseClient);
  const now = Date.parse("2026-10-23T08:00:00+07:00");
  const input = { uid: "owner", checkoutId: "demo_trial", kind: "trial" as const, plan: "month" as const, outcome: "success" as const, now };
  const [one, two] = await Promise.all([makeRepository().mutate("owner", input), makeRepository().mutate("owner", input)]);
  expect(one.billing?.expiresAt).toBe(now + 604800000);
  expect(two.billing?.expiresAt).toBe(now + 604800000);
  await expect(makeRepository().mutate("owner", { ...input, checkoutId: "trial-again", now: now + 604800001 })).rejects.toThrow("trial-used");
});

it("round-trips long logical operation IDs through collision-safe bounded cloud record IDs", async () => {
  const db = env.authenticatedContext("owner").firestore();
  const operations = ["a".repeat(200), "a".repeat(199) + "b"];
  const records = encodeRecords({ version: 1, weeks: [], pro: { appliedOperations: operations } });
  expect(records.map(record => record.id.length)).toEqual([180, 182]);
  for (const record of records) {
    const ref = doc(db, "users/owner/records", record.id);
    await assertSucceeds(setDoc(ref, { ...record, updatedAt: serverTimestamp() }));
    expect((await getDoc(ref)).data()?.value.operationId).toBe(record.value.operationId);
  }
});
