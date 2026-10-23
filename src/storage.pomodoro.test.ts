import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as storage from "./storage";
import type { PomodoroRuntime } from "./pomodoro";

const now = 1_700_000_000_000;
const settings = {
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 2,
  longBreakEvery: 2,
  sound: true,
  notifications: false,
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

async function start(scope: string): Promise<PomodoroRuntime | undefined> {
  await storage.dispatchPomodoroAction(scope, { type: "settings", settings });
  return (await storage.dispatchPomodoroAction(scope, { type: "start" }))
    ?.runtime;
}

describe("Pomodoro persistence", () => {
  it("serializes simultaneous completions into one history session and one outbox record", async () => {
    const scope = "account:pomodoro:race";
    const runtime = await start(scope);
    vi.setSystemTime(now + 60_000);
    const results = await Promise.all(
      [1, 2].map(() =>
        storage.dispatchPomodoroAction(scope, {
          type: "complete",
          expectedRevision: runtime?.revision,
          expectedSessionId: runtime?.sessionId,
        }),
      ),
    );
    expect(results.filter((r) => r?.session)).toHaveLength(1);
    const account = await storage.loadAccount(scope);
    expect(account.plan.pomodoroSessions).toHaveLength(1);
    expect(account.pending).toHaveLength(1);
    expect(account.pending[0].record).toMatchObject({
      kind: "pomodoroSession",
      deleted: false,
      value: { outcome: "completed", focusedDurationMs: 60_000 },
    });
    expect((await storage.loadPomodoroRuntime(scope))?.status).toBe("finished");
  });

  it("merges completed history when a stale Guest plan is saved", async () => {
    const scope = "guest:pomodoro:stale";
    const stale = await storage.loadPlan(scope);
    await start(scope);
    vi.setSystemTime(now + 60_000);
    await storage.dispatchPomodoroAction(scope, { type: "complete" });
    await storage.savePlan(scope, {
      ...stale,
      weeks: [{ id: "w", start: "2026-10-05", ended: false, projects: [] }],
    });
    const plan = await storage.loadPlan(scope);
    expect(plan.pomodoroSessions).toHaveLength(1);
    expect(plan.weeks).toHaveLength(1);
    expect((await storage.loadAccount(scope)).pending).toHaveLength(0);
  });

  it("merges completed history and preserves pending records when a stale account plan is saved", async () => {
    const scope = "account:pomodoro:stale";
    const stale = (await storage.loadAccount(scope)).plan;
    await start(scope);
    vi.setSystemTime(now + 60_000);
    await storage.dispatchPomodoroAction(scope, { type: "complete" });
    await storage.saveAccount(scope, stale, [], true);
    const account = await storage.loadAccount(scope);
    expect(account.plan.pomodoroSessions).toHaveLength(1);
    expect(account.pending).toHaveLength(1);
    expect(account.migrated).toBe(true);
    const history = await storage.loadPomodoroHistory(scope);
    expect(history?.sessions).toHaveLength(1);
    expect(history?.pending).toHaveLength(1);
  });

  it("recovers a deadline after reopening and saves only the single expired phase", async () => {
    const scope = "account:pomodoro:reload";
    const started = await start(scope);
    vi.setSystemTime(now + 600_000);
    expect(await storage.loadPomodoroRuntime(scope)).toMatchObject({
      status: "running",
      deadline: now + 60_000,
      sessionId: started?.sessionId,
    });
    await storage.dispatchPomodoroAction(scope, { type: "complete" });
    const history = (await storage.loadAccount(scope)).plan.pomodoroSessions;
    expect(history).toHaveLength(1);
    expect(history?.[0]).toMatchObject({
      endedAt: now + 60_000,
      focusedDurationMs: 60_000,
    });
  });

  it("stores a partial paused session without counting wall time spent paused", async () => {
    const scope = "account:pomodoro:pause";
    await start(scope);
    vi.setSystemTime(now + 20_000);
    await storage.dispatchPomodoroAction(scope, { type: "pause" });
    vi.setSystemTime(now + 600_000);
    const result = await storage.dispatchPomodoroAction(scope, {
      type: "stop",
    });
    expect(result?.session).toMatchObject({
      outcome: "stopped",
      focusedDurationMs: 20_000,
      endedAt: now + 600_000,
    });
    expect((await storage.loadAccount(scope)).pending).toHaveLength(1);
  });

  it("isolates settings and live state between Guest and account scopes", async () => {
    await start("guest:pomodoro:isolation");
    expect(
      await storage.loadPomodoroRuntime("account:pomodoro:isolation"),
    ).toMatchObject({ status: "ready", settings: { focusMinutes: 25 } });
    expect(
      await storage.loadPomodoroRuntime("guest:pomodoro:isolation"),
    ).toMatchObject({ status: "running", settings: { focusMinutes: 1 } });
  });

  it("returns persisted state without applying a stale revision action", async () => {
    const scope = "account:pomodoro:revision";
    const runtime = await start(scope);
    vi.setSystemTime(now + 10_000);
    const result = await storage.dispatchPomodoroAction(scope, {
      type: "stop",
      expectedRevision: 0,
    });
    expect(result?.changed).toBe(false);
    expect(result?.runtime).toEqual(runtime);
    expect((await storage.loadAccount(scope)).pending).toHaveLength(0);
  });

  it("rolls back runtime and history if writing the outbox fails before commit", async () => {
    const scope = "account:pomodoro:rollback";
    const runtime = await start(scope);
    vi.setSystemTime(now + 60_000);
    const originalPut = IDBObjectStore.prototype.put;
    const failure = new DOMException("Disk is full", "QuotaExceededError");
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        if (this.name === "outbox") throw failure;
        return originalPut.call(this, value, key);
      });
    try {
      await expect(
        storage.dispatchPomodoroAction(scope, { type: "complete" }),
      ).rejects.toThrow("Disk is full");
    } finally {
      put.mockRestore();
    }
    expect(await storage.loadPomodoroRuntime(scope)).toEqual(runtime);
    expect(
      (await storage.loadAccount(scope)).plan.pomodoroSessions ?? [],
    ).toHaveLength(0);
    expect((await storage.loadAccount(scope)).pending).toHaveLength(0);
  });
});
