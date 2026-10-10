import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CloudRecord } from "./records";

const transport = vi.hoisted(() => ({
  commit: undefined as
    undefined | ((uid: string, records: CloudRecord[]) => Promise<void>),
  databaseStarts: 0,
  listenerStarts: 0,
  listeners: new Map<string, (snapshot: unknown) => void>(),
  persistence: {},
  popupResolver: {},
  authOptions: undefined as unknown,
  redirects: 0,
  auth: { languageCode: "", authStateReady: async () => {} },
}));

vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => transport.auth,
  initializeAuth: (_app: unknown, options: unknown) => {
    transport.authOptions = options;
    return transport.auth;
  },
  connectAuthEmulator: () => {},
  setPersistence: async () => {},
  getRedirectResult: async () => {
    transport.redirects++;
    return null;
  },
  indexedDBLocalPersistence: transport.persistence,
  browserPopupRedirectResolver: transport.popupResolver,
  GoogleAuthProvider: class {},
  signInWithPopup: async (
    _auth: unknown,
    _provider: unknown,
    resolver: unknown,
  ) => ({ resolver }),
}));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: () => {
    transport.databaseStarts++;
    return {};
  },
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  connectFirestoreEmulator: () => {},
  serverTimestamp: () => "server-timestamp",
  collection: (_db: unknown, _users: string, uid: string) => ({ uid }),
  onSnapshot: (
    reference: { uid: string },
    _options: unknown,
    callback: (snapshot: unknown) => void,
  ) => {
    transport.listenerStarts++;
    transport.listeners.set(reference.uid, callback);
    return () => transport.listeners.delete(reference.uid);
  },
  doc: (
    _db: unknown,
    _users: string,
    uid: string,
    _records: string,
    id: string,
  ) => ({ uid, id }),
  writeBatch: () => {
    let uid = "";
    const records: CloudRecord[] = [];
    return {
      set: (reference: { uid: string }, record: CloudRecord) => {
        uid = reference.uid;
        records.push(record);
      },
      commit: () => transport.commit!(uid, records),
    };
  },
}));

const record = (id: string, dayOrder: number): CloudRecord => ({
  id,
  kind: "subtask",
  parent: "task",
  order: 0,
  deleted: false,
  value: { id, day: 0, weight: 1, note: "", done: false, missed: [], dayOrder },
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
let client: Awaited<
  ReturnType<(typeof import("./firebaseClient"))["getFirebaseClient"]>
>;
let cloud: Map<string, CloudRecord>;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_USE_FIREBASE_EMULATORS", "true");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-weekdam");
  transport.databaseStarts = 0;
  transport.listenerStarts = 0;
  transport.listeners.clear();
  transport.authOptions = undefined;
  transport.redirects = 0;
  transport.auth.languageCode = "";
  cloud = new Map();
  transport.commit = async (uid, records) => {
    for (const entry of records) cloud.set(uid + "/" + entry.id, entry);
  };
  client = await (await import("./firebaseClient")).getFirebaseClient();
});
afterEach(() => vi.unstubAllEnvs());

it("starts a Guest client without initializing Firestore or redirect handling", () => {
  expect(transport.databaseStarts).toBe(0);
  expect(transport.authOptions).toEqual({ persistence: transport.persistence });
  expect(transport.redirects).toBe(0);
});

it("initializes a popup resolver only when sign-in is requested", async () => {
  expect(await client.login("vi")).toEqual({
    resolver: transport.popupResolver,
  });
  expect(transport.auth.languageCode).toBe("vi");
  expect(transport.databaseStarts).toBe(0);
});

it("does not attach a lazy watch canceled before database initialization completes", async () => {
  const failures: string[] = [];
  const stop = client.watch(
    "canceled",
    () => {
      throw new Error("unexpected snapshot");
    },
    () => failures.push("error"),
  );
  expect(typeof stop).toBe("function");
  stop();
  // Wait for the shared initialization promise by completing a real client write.
  await client.write("owner", [record("step", 1024)]);
  expect(transport.databaseStarts).toBe(1);
  expect(transport.listenerStarts).toBe(0);
  expect(transport.listeners.size).toBe(0);
  expect(failures).toEqual([]);
  expect(cloud.get("owner/step")?.value.dayOrder).toBe(1024);
});

it("attaches an active lazy watch and releases it through the synchronous unsubscribe", async () => {
  const snapshots: unknown[] = [];
  const stop = client.watch(
    "owner",
    (...snapshot) => snapshots.push(snapshot),
    () => {
      throw new Error("unexpected watch failure");
    },
  );
  await client.write("owner", [record("step", 1024)]);
  expect(transport.databaseStarts).toBe(1);
  expect(transport.listenerStarts).toBe(1);
  transport.listeners.get("owner")!({
    docs: [{ id: "step", data: () => record("step", 1024) }],
    metadata: { fromCache: true, hasPendingWrites: false },
  });
  expect(snapshots).toEqual([[[record("step", 1024)], true, false]]);
  stop();
  expect(transport.listeners.size).toBe(0);
});

it("keeps a newer same-record move after an older write spans multiple chunks", async () => {
  const firstSubmitted = deferred(),
    releaseFirst = deferred();
  transport.commit = async (uid, records) => {
    if (records.some((entry) => entry.id === "s0")) {
      firstSubmitted.resolve();
      await releaseFirst.promise;
    }
    for (const entry of records) cloud.set(uid + "/" + entry.id, entry);
  };
  const older = client.write(
    "owner",
    Array.from({ length: 101 }, (_, index) =>
      record("s" + index, 1024 * (index + 1)),
    ),
  );
  await firstSubmitted.promise;
  const newer = client.write("owner", [record("s100", 512)]);
  releaseFirst.resolve();
  await Promise.all([older, newer]);
  expect(cloud.get("owner/s100")?.value.dayOrder).toBe(512);
  expect(cloud.size).toBe(101);
});

it("lets another account save while the first account's write is waiting", async () => {
  const firstSubmitted = deferred(),
    releaseFirst = deferred();
  transport.commit = async (uid, records) => {
    if (uid === "first") {
      firstSubmitted.resolve();
      await releaseFirst.promise;
    }
    for (const entry of records) cloud.set(uid + "/" + entry.id, entry);
  };
  const waiting = client.write("first", [record("step", 1024)]);
  await firstSubmitted.promise;
  try {
    await client.write("second", [record("step", 2048)]);
    expect(cloud.get("second/step")?.value.dayOrder).toBe(2048);
    expect(cloud.has("first/step")).toBe(false);
  } finally {
    releaseFirst.resolve();
    await waiting;
  }
});

it("reports a failed write and still saves the next queued revision", async () => {
  const firstSubmitted = deferred(),
    releaseFirst = deferred();
  const failure = new Error("write-failed");
  transport.commit = async (uid, records) => {
    if (records[0].value.dayOrder === 1024) {
      firstSubmitted.resolve();
      await releaseFirst.promise;
      throw failure;
    }
    for (const entry of records) cloud.set(uid + "/" + entry.id, entry);
  };
  const failed = client.write("owner", [record("step", 1024)]);
  const rejection = expect(failed).rejects.toBe(failure);
  await firstSubmitted.promise;
  const newer = client.write("owner", [record("step", 2048)]);
  releaseFirst.resolve();
  await rejection;
  await newer;
  expect(cloud.get("owner/step")?.value.dayOrder).toBe(2048);
  await client.write("owner", [record("step", 3072)]);
  expect(cloud.get("owner/step")?.value.dayOrder).toBe(3072);
});
