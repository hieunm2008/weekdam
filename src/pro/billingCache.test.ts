import { describe, expect, it } from "vitest";
import { createBillingCache } from "./billingCache";
import { createBillingMutation } from "./billing";

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
const paid = createBillingMutation(null, null, {
  uid: "same-uid",
  checkoutId: "pay-one",
  kind: "checkout",
  plan: "month",
  outcome: "success",
  now: 1792717200000,
}).billing!;

describe("confirmed entitlement cache", () => {
  it("keeps the same UID isolated between Emulator and a cloud sandbox", () => {
    const browser = storage();
    const emulator = createBillingCache("demo-weekdam-pro", browser);
    const sandbox = createBillingCache("weekdam-pro-sandbox", browser);
    emulator.save(paid);
    expect(emulator.read("same-uid")).toEqual(paid);
    expect(sandbox.read("same-uid")).toBeNull();
    expect(emulator.read("other-uid")).toBeNull();
    sandbox.save({ ...paid, expiresAt: paid.expiresAt + 1000 });
    expect(emulator.read("same-uid")?.expiresAt).toBe(paid.expiresAt);
    expect(sandbox.read("same-uid")?.expiresAt).toBe(paid.expiresAt + 1000);
  });
  it("does not trust old unscoped cache entries for any project", () => {
    const browser = storage();
    browser.setItem("weekdam:demo-billing:same-uid", JSON.stringify(paid));
    expect(
      createBillingCache("demo-weekdam-pro", browser).read("same-uid"),
    ).toBeNull();
  });
});
