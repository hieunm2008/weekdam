/** Client-managed demo entitlement only. This is not a real payment authority. */
export type DemoPlan = "month" | "year";
export type DemoOutcome = "success" | "failed" | "cancelled";
export type DemoBilling = {
  demo: true;
  uid: string;
  status: "free" | "trial" | "pro";
  plan: DemoPlan | null;
  trialUsed: boolean;
  trialStartedAt: number | null;
  expiresAt: number;
  updatedAt: number;
};
export type DemoReceipt = {
  demo: true;
  uid: string;
  checkoutId: string;
  kind: "trial" | "checkout";
  plan: DemoPlan;
  outcome: DemoOutcome;
  amountVnd: number;
  createdAt: number;
  previousExpiresAt: number;
  expiresAt: number;
};
export type BillingStatus =
  "guest" | "checking" | "free" | "trial" | "pro" | "expired" | "error";
export type BillingMutationInput = {
  uid: string;
  checkoutId: string;
  kind: "trial" | "checkout";
  plan: DemoPlan;
  outcome: DemoOutcome;
  now: number;
};
const time = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 8_640_000_000_000_000;
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const planValid = (value: unknown): value is DemoPlan =>
  value === "month" || value === "year";
const outcomeValid = (value: unknown): value is DemoOutcome =>
  ["success", "failed", "cancelled"].includes(String(value));
const validId = (value: string) =>
  /^[A-Za-z0-9_.:-]{1,200}$/.test(value) &&
  value !== "." &&
  value !== ".." &&
  !/^__.*__$/.test(value);

export function emptyBilling(uid: string): DemoBilling {
  return {
    demo: true,
    uid,
    status: "free",
    plan: null,
    trialUsed: false,
    trialStartedAt: null,
    expiresAt: 0,
    updatedAt: 0,
  };
}

export function parseBilling(value: unknown, uid: string): DemoBilling | null {
  if (
    !object(value) ||
    value.demo !== true ||
    value.uid !== uid ||
    !["free", "trial", "pro"].includes(String(value.status)) ||
    !(value.plan === null || planValid(value.plan)) ||
    typeof value.trialUsed !== "boolean" ||
    !(value.trialStartedAt === null || time(value.trialStartedAt)) ||
    !time(value.expiresAt) ||
    !time(value.updatedAt)
  )
    return null;
  if (
    value.status === "trial" &&
    (!value.trialUsed || value.trialStartedAt === null)
  )
    return null;
  return {
    demo: true,
    uid,
    status: value.status as DemoBilling["status"],
    plan: value.plan,
    trialUsed: value.trialUsed,
    trialStartedAt: value.trialStartedAt,
    expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
  };
}

export function parseReceipt(value: unknown, uid: string): DemoReceipt | null {
  if (
    !object(value) ||
    value.demo !== true ||
    value.uid !== uid ||
    typeof value.checkoutId !== "string" ||
    !validId(value.checkoutId) ||
    !["trial", "checkout"].includes(String(value.kind)) ||
    !planValid(value.plan) ||
    !outcomeValid(value.outcome) ||
    !time(value.createdAt) ||
    !time(value.previousExpiresAt) ||
    !time(value.expiresAt) ||
    typeof value.amountVnd !== "number"
  )
    return null;
  if (
    value.amountVnd !==
    (value.kind === "trial" ? 0 : value.plan === "month" ? 29000 : 249000)
  )
    return null;
  return {
    demo: true,
    uid,
    checkoutId: value.checkoutId,
    kind: value.kind as DemoReceipt["kind"],
    plan: value.plan,
    outcome: value.outcome,
    amountVnd: value.amountVnd,
    createdAt: value.createdAt,
    previousExpiresAt: value.previousExpiresAt,
    expiresAt: value.expiresAt,
  };
}

export function hasProAccess(
  billing: DemoBilling | null,
  uid: string | null,
  now = Date.now(),
) {
  return Boolean(
    uid &&
    billing?.uid === uid &&
    billing.status !== "free" &&
    billing.expiresAt > now,
  );
}

export function billingStatus(
  billing: DemoBilling | null,
  uid: string | null,
  now = Date.now(),
): BillingStatus {
  if (!uid) return "guest";
  if (!billing || billing.uid !== uid) return "checking";
  if (billing.status === "free") return "free";
  return hasProAccess(billing, uid, now) ? billing.status : "expired";
}

/** Calendar renewal uses wall-clock Vietnam time and clamps e.g. Jan 31 to Feb 28. */
export function addCalendarPeriod(timestamp: number, period: DemoPlan): number {
  if (!time(timestamp) || !planValid(period)) throw new Error("billing-time");
  const offset = 7 * 60 * 60 * 1000;
  const local = new Date(timestamp + offset);
  const targetMonth = local.getUTCMonth() + (period === "month" ? 1 : 12);
  const lastDay = new Date(
    Date.UTC(local.getUTCFullYear(), targetMonth + 1, 0),
  ).getUTCDate();
  return (
    Date.UTC(
      local.getUTCFullYear(),
      targetMonth,
      Math.min(local.getUTCDate(), lastDay),
      local.getUTCHours(),
      local.getUTCMinutes(),
      local.getUTCSeconds(),
      local.getUTCMilliseconds(),
    ) - offset
  );
}

/** Called inside the Firestore transaction, with receipt read before any writes. */
export function createBillingMutation(
  current: DemoBilling | null,
  existing: DemoReceipt | null,
  input: BillingMutationInput,
) {
  if (
    !input.uid ||
    (current && current.uid !== input.uid) ||
    (existing && existing.uid !== input.uid)
  )
    throw new Error("billing-account");
  if (!validId(input.checkoutId)) throw new Error("checkout-id");
  if (!time(input.now)) throw new Error("billing-time");
  if (
    !planValid(input.plan) ||
    !outcomeValid(input.outcome) ||
    !["trial", "checkout"].includes(input.kind)
  )
    throw new Error("billing-input");
  if (existing) {
    if (existing.checkoutId !== input.checkoutId)
      throw new Error("checkout-id");
    return { billing: current, receipt: existing, reused: true };
  }
  const before = current ?? emptyBilling(input.uid);
  let billing = before;
  if (input.kind === "trial") {
    if (before.trialUsed) throw new Error("trial-used");
    if (hasProAccess(before, input.uid, input.now))
      throw new Error("pro-active");
    if (input.outcome !== "success") throw new Error("billing-input");
    billing = {
      ...before,
      status: "trial",
      plan: null,
      trialUsed: true,
      trialStartedAt: input.now,
      expiresAt: input.now + 7 * 24 * 60 * 60 * 1000,
      updatedAt: input.now,
    };
  } else if (input.outcome === "success") {
    billing = {
      ...before,
      status: "pro",
      plan: input.plan,
      expiresAt: addCalendarPeriod(
        Math.max(input.now, before.expiresAt),
        input.plan,
      ),
      updatedAt: input.now,
    };
  }
  const receipt: DemoReceipt = {
    demo: true,
    uid: input.uid,
    checkoutId: input.checkoutId,
    kind: input.kind,
    plan: input.plan,
    outcome: input.outcome,
    amountVnd:
      input.kind === "trial" ? 0 : input.plan === "month" ? 29000 : 249000,
    createdAt: input.now,
    previousExpiresAt: before.expiresAt,
    expiresAt: billing.expiresAt,
  };
  return { billing, receipt, reused: false };
}

export function createCheckoutId() {
  return `demo_${crypto.randomUUID()}`;
}
