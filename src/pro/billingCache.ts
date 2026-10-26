import { parseBilling, type DemoBilling } from "./billing";

/** Browser storage adapter for the confirmed demo entitlement. */
export function createBillingCache(
  projectId: string,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) {
  const key = (uid: string) => `weekdam:demo-billing:${projectId}:${uid}`;
  return {
    read(uid: string) {
      try {
        return parseBilling(
          JSON.parse(storage.getItem(key(uid)) ?? "null"),
          uid,
        );
      } catch {
        return null;
      }
    },
    save(billing: DemoBilling) {
      try {
        storage.setItem(key(billing.uid), JSON.stringify(billing));
      } catch {
        /* Firestore's persistent cache remains available if browser storage is full. */
      }
    },
  };
}
