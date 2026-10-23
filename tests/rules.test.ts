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
    projectId: "demo-weekdam",
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
