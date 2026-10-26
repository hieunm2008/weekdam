import {
  billingStatus,
  createCheckoutId,
  emptyBilling,
  hasProAccess,
  parseBilling,
  type BillingMutationInput,
  type BillingStatus,
  type DemoBilling,
  type DemoOutcome,
  type DemoPlan,
  type DemoReceipt,
} from "./billing";

export type BillingRepository = {
  watch: (
    uid: string,
    callback: (
      billing: DemoBilling | null,
      receipts: DemoReceipt[],
      confirmed: boolean,
    ) => void,
    onError: (error: unknown) => void,
  ) => () => void;
  mutate: (
    uid: string,
    input: BillingMutationInput,
  ) => Promise<{ billing: DemoBilling | null; receipt: DemoReceipt }>;
};
export type BillingSnapshot = {
  uid: string;
  status: BillingStatus;
  billing: DemoBilling | null;
  receipts: DemoReceipt[];
  busy: boolean;
  online: boolean;
  error: string;
  isPro: boolean;
};

/** Owns a single UID. Disposal invalidates every in-flight UI result. */
export class BillingSession {
  private billing: DemoBilling | null;
  private receipts: DemoReceipt[] = [];
  private online: boolean;
  private error = "";
  private active = true;
  private clock: number;
  private stop: () => void;
  private listeners = new Set<() => void>();
  private pending = new Map<string, Promise<DemoReceipt | null>>();
  private saveCache: (billing: DemoBilling) => void;
  private now: () => number;

  constructor(
    private uid: string,
    private repository: BillingRepository,
    options: {
      online?: boolean;
      cached?: DemoBilling | null;
      now?: () => number;
      saveCache?: (billing: DemoBilling) => void;
    } = {},
  ) {
    this.now = options.now ?? Date.now;
    this.clock = this.now();
    this.online = options.online ?? true;
    this.billing = parseBilling(options.cached, uid);
    this.saveCache = options.saveCache ?? (() => {});
    this.stop = repository.watch(
      uid,
      (billing, receipts, confirmed) => {
        if (!this.active) return;
        // An empty cache is not evidence that the server account is Free.
        if (confirmed || billing) {
          this.billing = billing ?? emptyBilling(uid);
          if (confirmed) this.saveCache(this.billing);
        }
        this.receipts = receipts;
        this.error = "";
        this.emit();
      },
      (error) => {
        if (!this.active) return;
        this.error = error instanceof Error ? error.message : "billing-error";
        this.emit();
      },
    );
  }

  snapshot(): BillingSnapshot {
    return {
      uid: this.uid,
      status: billingStatus(this.billing, this.uid, this.clock),
      billing: this.billing,
      receipts: this.receipts,
      busy: this.pending.size > 0,
      online: this.online,
      error: this.error,
      isPro: hasProAccess(this.billing, this.uid, this.clock),
    };
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    for (const listener of this.listeners) listener();
  }
  tick(now = this.now()) {
    this.clock = now;
    if (this.active) this.emit();
  }
  setOnline(online: boolean) {
    this.online = online;
    this.tick();
  }
  dispose() {
    this.active = false;
    this.stop();
    this.listeners.clear();
  }
  async startTrial() {
    const receipt = await this.run({
      uid: this.uid,
      checkoutId: "demo_trial",
      kind: "trial",
      plan: "month",
      outcome: "success",
      now: this.now(),
    });
    return Boolean(receipt?.outcome === "success");
  }
  checkout(
    plan: DemoPlan,
    outcome: DemoOutcome,
    checkoutId = createCheckoutId(),
  ) {
    return this.run({
      uid: this.uid,
      checkoutId,
      kind: "checkout",
      plan,
      outcome,
      now: this.now(),
    });
  }
  private run(input: BillingMutationInput): Promise<DemoReceipt | null> {
    if (!this.active) return Promise.resolve(null);
    if (!this.online) {
      this.error = "billing-offline";
      this.emit();
      return Promise.resolve(null);
    }
    const existing = this.pending.get(input.checkoutId);
    if (existing) return existing;
    this.error = "";
    // The repository resolves only after the Firestore transaction commits.
    const work = this.repository
      .mutate(this.uid, input)
      .then((result) => {
        if (!this.active) return null;
        this.billing = result.billing ?? emptyBilling(this.uid);
        this.saveCache(this.billing);
        this.receipts = [
          result.receipt,
          ...this.receipts.filter(
            (r) => r.checkoutId !== result.receipt.checkoutId,
          ),
        ].sort((a, b) => b.createdAt - a.createdAt);
        this.clock = this.now();
        return result.receipt;
      })
      .catch((error: unknown) => {
        if (this.active)
          this.error = error instanceof Error ? error.message : "billing-error";
        return null;
      })
      .finally(() => {
        this.pending.delete(input.checkoutId);
        if (this.active) this.emit();
      });
    this.pending.set(input.checkoutId, work);
    this.emit();
    return work;
  }
}
