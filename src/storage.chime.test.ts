import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as storage from "./storage";

const now = 1_791_691_000_000;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

async function complete(scope: string, reset = false) {
  await storage.dispatchPomodoroAction(scope, {
    type: "settings",
    settings: {
      focusMinutes: 1,
      shortBreakMinutes: 1,
      longBreakMinutes: 2,
      longBreakEvery: 2,
      sound: true,
      notifications: false,
    },
  });
  await storage.dispatchPomodoroAction(scope, { type: "start" });
  vi.setSystemTime(now + 60_000);
  return storage.dispatchPomodoroAction(scope, {
    type: reset ? "reset" : "complete",
  });
}

it("allows only one eligible tab to consume a completed phase chime", async () => {
  const scope = "guest:chime:race";
  const finished = await complete(scope);
  const claims = await Promise.all(
    [1, 2].map(() =>
      storage.claimPomodoroChime?.(scope, finished.runtime.revision),
    ),
  );
  expect(claims.filter(Boolean)).toHaveLength(1);
  expect(
    await storage.claimPomodoroChime?.(scope, finished.runtime.revision),
  ).toBe(false);
});

it("retains the completion identity when the next manual phase starts", async () => {
  const scope = "guest:chime:next";
  const finished = await complete(scope);
  await storage.dispatchPomodoroAction(scope, { type: "next" });
  expect(
    await storage.claimPomodoroChime?.(scope, finished.runtime.revision),
  ).toBe(true);
  expect(
    await storage.claimPomodoroChime?.(scope, finished.runtime.revision - 1),
  ).toBe(false);
});

it("records a full phase chime even if the user resets at its deadline", async () => {
  const scope = "guest:chime:reset";
  const finished = await complete(scope, true);
  expect(finished.runtime.status).toBe("ready");
  expect(finished.session?.outcome).toBe("completed");
  expect(
    await storage.claimPomodoroChime?.(scope, finished.runtime.revision),
  ).toBe(true);
});

it("does not consume an incomplete, unrelated, or disabled phase alert", async () => {
  const scope = "guest:chime:disabled";
  expect(await storage.claimPomodoroChime?.(scope, 0)).toBe(false);
  const finished = await complete(scope);
  await storage.dispatchPomodoroAction(scope, {
    type: "settings",
    settings: { ...finished.runtime.settings, sound: false },
  });
  expect(
    await storage.claimPomodoroChime?.(scope, finished.runtime.revision),
  ).toBe(false);
  expect(
    await storage.claimPomodoroChime?.(
      "account:demo:other",
      finished.runtime.revision,
    ),
  ).toBe(false);
});
