import { describe, expect, it } from "vitest";
import { BillingSession, type BillingRepository } from "./billingSession";
import {
  createBillingMutation,
  emptyBilling,
  type DemoBilling,
  type DemoReceipt,
} from "./billing";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const now = Date.parse("2026-10-23T08:00:00+07:00");
const committed = createBillingMutation(null, null, {
  uid: "owner",
  checkoutId: "buy-1",
  kind: "checkout",
  plan: "month",
  outcome: "success",
  now,
});
function repository() {
  const pending = deferred<{
    billing: DemoBilling | null;
    receipt: DemoReceipt;
  }>();
  let deliver!: Parameters<BillingRepository["watch"]>[1];
  let stopped = false;
  const writes: string[] = [];
  const repo: BillingRepository = {
    watch: (_uid, callback) => {
      deliver = callback;
      return () => {
        stopped = true;
      };
    },
    mutate: async (_uid, input) => {
      writes.push(input.checkoutId);
      return pending.promise;
    },
  };
  return {
    repo,
    pending,
    writes,
    deliver: (...args: Parameters<typeof deliver>) => deliver(...args),
    stopped: () => stopped,
  };
}

describe("account billing session", () => {
  it("stays checking for an empty local snapshot until the server confirms Free", () => {
    const remote = repository();
    const session = new BillingSession("owner", remote.repo, {
      now: () => now,
    });
    remote.deliver(null, [], false);
    expect(session.snapshot().status).toBe("checking");
    remote.deliver(null, [], true);
    expect(session.snapshot().status).toBe("free");
    session.dispose();
  });
  it("grants Pro only after commit and coalesces double clicks with the same ID", async () => {
    const remote = repository();
    const session = new BillingSession("owner", remote.repo, {
      now: () => now,
    });
    const first = session.checkout("month", "success", "buy-1");
    const second = session.checkout("month", "success", "buy-1");
    expect(session.snapshot().isPro).toBe(false);
    expect(session.snapshot().busy).toBe(true);
    expect(remote.writes).toEqual(["buy-1"]);
    remote.pending.resolve(committed);
    expect(await first).toMatchObject({
      checkoutId: "buy-1",
      outcome: "success",
    });
    expect(await second).toMatchObject({ checkoutId: "buy-1" });
    expect(session.snapshot()).toMatchObject({
      isPro: true,
      status: "pro",
      busy: false,
    });
    session.dispose();
  });
  it("does not publish an old account completion after its listener is disposed", async () => {
    const remote = repository();
    const session = new BillingSession("owner", remote.repo, {
      now: () => now,
    });
    const pending = session.checkout("month", "success", "buy-1");
    session.dispose();
    remote.pending.resolve(committed);
    expect(await pending).toBeNull();
    expect(remote.stopped()).toBe(true);
    expect(session.snapshot().isPro).toBe(false);
  });
  it("uses only matching cached entitlement offline and disallows checkout", async () => {
    const remote = repository();
    const session = new BillingSession("owner", remote.repo, {
      now: () => now,
      online: false,
      cached: committed.billing,
    });
    expect(session.snapshot()).toMatchObject({ isPro: true, online: false });
    expect(await session.checkout("year", "success", "offline")).toBeNull();
    expect(session.snapshot().error).toBe("billing-offline");
    expect(remote.writes).toEqual([]);
    session.tick(now + 40 * 86400000);
    expect(session.snapshot().status).toBe("expired");
    const other = new BillingSession("other", remote.repo, {
      now: () => now,
      online: false,
      cached: committed.billing,
    });
    expect(other.snapshot()).toMatchObject({
      status: "checking",
      isPro: false,
    });
    session.dispose();
    other.dispose();
  });
  it("failed server commit never reports an upgrade or writes entitlement cache", async () => {
    const remote = repository();
    const cached: DemoBilling[] = [];
    const session = new BillingSession("owner", remote.repo, {
      now: () => now,
      saveCache: (value) => cached.push(value),
    });
    remote.deliver(emptyBilling("owner"), [], true);
    cached.length = 0;
    const pending = session.checkout("month", "success", "buy-1");
    remote.pending.reject(new Error("permission-denied"));
    expect(await pending).toBeNull();
    expect(session.snapshot()).toMatchObject({
      isPro: false,
      busy: false,
      error: "permission-denied",
    });
    expect(cached).toEqual([]);
    session.dispose();
  });
});
