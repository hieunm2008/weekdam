import { describe, expect, it } from "vitest";
import {
  addCalendarPeriod,
  billingStatus,
  createBillingMutation,
  emptyBilling,
  hasProAccess,
  parseBilling,
  parseReceipt,
} from "./billing";

const instant = (date: string) => Date.parse(date);
const now = instant("2026-01-31T23:30:00+07:00");

describe("demo billing calendar and access", () => {
  it("renews by Vietnamese calendar month with a clamped last day", () => {
    expect(addCalendarPeriod(now, "month")).toBe(
      instant("2026-02-28T23:30:00+07:00"),
    );
    expect(
      addCalendarPeriod(instant("2024-02-29T00:10:00+07:00"), "year"),
    ).toBe(instant("2025-02-28T00:10:00+07:00"));
    expect(
      addCalendarPeriod(instant("2026-12-31T23:30:00+07:00"), "month"),
    ).toBe(instant("2027-01-31T23:30:00+07:00"));
  });
  it("expires at the exact boundary and never grants another UID access", () => {
    const billing = {
      ...emptyBilling("owner"),
      status: "pro" as const,
      expiresAt: now + 1,
    };
    expect(hasProAccess(billing, "owner", now)).toBe(true);
    expect(hasProAccess(billing, "other", now)).toBe(false);
    expect(hasProAccess(billing, "owner", now + 1)).toBe(false);
    expect(billingStatus(billing, "owner", now + 1)).toBe("expired");
    expect(billingStatus(null, "owner", now)).toBe("checking");
    expect(billingStatus(null, null, now)).toBe("guest");
  });
});

describe("immutable simulated receipts", () => {
  it("starts a seven day trial only once and records the trial without money", () => {
    const result = createBillingMutation(null, null, {
      uid: "owner",
      checkoutId: "trial",
      kind: "trial",
      plan: "month",
      outcome: "success",
      now,
    });
    expect(result.billing).toMatchObject({
      uid: "owner",
      demo: true,
      status: "trial",
      trialUsed: true,
      trialStartedAt: now,
      expiresAt: now + 604_800_000,
    });
    expect(result.receipt).toMatchObject({
      demo: true,
      kind: "trial",
      outcome: "success",
      amountVnd: 0,
    });
    expect(() =>
      createBillingMutation(result.billing, null, {
        uid: "owner",
        checkoutId: "trial-again",
        kind: "trial",
        plan: "month",
        outcome: "success",
        now: now + 604_800_001,
      }),
    ).toThrow("trial-used");
  });
  it("retries a receipt without extending entitlement, even if the retry changes outcome", () => {
    const input = {
      uid: "owner",
      checkoutId: "checkout-1",
      kind: "checkout" as const,
      plan: "month" as const,
      outcome: "success" as const,
      now,
    };
    const first = createBillingMutation(null, null, input);
    const retry = createBillingMutation(first.billing, first.receipt, {
      ...input,
      outcome: "failed",
      now: now + 1000,
    });
    expect(retry).toEqual({
      billing: first.billing,
      receipt: first.receipt,
      reused: true,
    });
  });
  it("renews from the later of now and the existing expiry", () => {
    const active = {
      ...emptyBilling("owner"),
      status: "pro" as const,
      expiresAt: instant("2026-03-31T23:30:00+07:00"),
    };
    const next = createBillingMutation(active, null, {
      uid: "owner",
      checkoutId: "renew",
      kind: "checkout",
      plan: "month",
      outcome: "success",
      now,
    });
    expect(next.billing?.expiresAt).toBe(instant("2026-04-30T23:30:00+07:00"));
    const expired = { ...active, expiresAt: now - 1 };
    expect(
      createBillingMutation(expired, null, {
        uid: "owner",
        checkoutId: "renew-expired",
        kind: "checkout",
        plan: "year",
        outcome: "success",
        now,
      }).billing?.expiresAt,
    ).toBe(instant("2027-01-31T23:30:00+07:00"));
  });
  it.each(["failed", "cancelled"] as const)(
    "records %s without granting or extending Pro",
    (outcome) => {
      const before = emptyBilling("owner");
      const result = createBillingMutation(before, null, {
        uid: "owner",
        checkoutId: outcome,
        kind: "checkout",
        plan: "year",
        outcome,
        now,
      });
      expect(result.billing).toEqual(before);
      expect(result.receipt).toMatchObject({
        outcome,
        expiresAt: 0,
        amountVnd: 249000,
      });
      expect(hasProAccess(result.billing, "owner", now)).toBe(false);
      expect(
        createBillingMutation(result.billing, result.receipt, {
          uid: "owner",
          checkoutId: outcome,
          kind: "checkout",
          plan: "year",
          outcome: "success",
          now,
        }).reused,
      ).toBe(true);
    },
  );
  it("rejects malformed inputs or records from another account", () => {
    const input = {
      uid: "owner",
      checkoutId: "checkout-1",
      kind: "checkout" as const,
      plan: "month" as const,
      outcome: "success" as const,
      now,
    };
    expect(() =>
      createBillingMutation(emptyBilling("other"), null, input),
    ).toThrow("billing-account");
    expect(() =>
      createBillingMutation(null, null, { ...input, checkoutId: "bad/path" }),
    ).toThrow("checkout-id");
    expect(() =>
      createBillingMutation(null, null, { ...input, now: NaN }),
    ).toThrow("billing-time");
    expect(
      parseBilling({ ...emptyBilling("owner"), expiresAt: Infinity }, "owner"),
    ).toBeNull();
    expect(parseBilling(emptyBilling("other"), "owner")).toBeNull();
    const result = createBillingMutation(null, null, input);
    expect(parseReceipt(result.receipt, "other")).toBeNull();
    expect(
      parseReceipt({ ...result.receipt, outcome: "unknown" }, "owner"),
    ).toBeNull();
    expect(parseBilling(result.billing, "owner")).toEqual(result.billing);
    expect(parseReceipt(result.receipt, "owner")).toEqual(result.receipt);
  });
});
