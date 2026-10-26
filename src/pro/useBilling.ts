import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseClient, type FirebaseClient } from "../firebaseClient";
import {
  createBillingMutation,
  parseBilling,
  parseReceipt,
  type DemoBilling,
  type DemoOutcome,
  type DemoPlan,
  type DemoReceipt,
} from "./billing";
import {
  BillingSession,
  type BillingRepository,
  type BillingSnapshot,
} from "./billingSession";
import { createBillingCache } from "./billingCache";

export { createCheckoutId } from "./billing";

export function createFirebaseBillingRepository(
  client: FirebaseClient,
): BillingRepository {
  const assertAccount = (uid: string) => {
    if (client.auth.currentUser?.uid !== uid)
      throw new Error("billing-account-changed");
    if (globalThis.navigator?.onLine === false)
      throw new Error("billing-offline");
  };
  return {
    watch(uid, callback, onError) {
      let active = true;
      const stops: (() => void)[] = [];
      let billing: DemoBilling | null = null;
      let receipts: DemoReceipt[] = [];
      let confirmed = false;
      void client
        .getDatabase()
        .then(({ db, firestore }) => {
          if (!active) return;
          stops.push(
            firestore.onSnapshot(
              firestore.doc(db, "users", uid, "demoBilling", "current"),
              { includeMetadataChanges: true },
              (snapshot) => {
                if (!active || snapshot.metadata.hasPendingWrites) return;
                billing = snapshot.exists()
                  ? parseBilling(snapshot.data(), uid)
                  : null;
                if (snapshot.exists() && !billing) {
                  onError(new Error("billing-invalid"));
                  return;
                }
                confirmed = !snapshot.metadata.fromCache;
                callback(billing, receipts, confirmed);
              },
              onError,
            ),
          );
          stops.push(
            firestore.onSnapshot(
              firestore.collection(db, "users", uid, "demoReceipts"),
              { includeMetadataChanges: true },
              (snapshot) => {
                if (!active || snapshot.metadata.hasPendingWrites) return;
                receipts = snapshot.docs
                  .flatMap((document) => {
                    const receipt = parseReceipt(document.data(), uid);
                    return receipt ? [receipt] : [];
                  })
                  .sort((a, b) => b.createdAt - a.createdAt);
                callback(billing, receipts, confirmed);
              },
              onError,
            ),
          );
        })
        .catch((error) => {
          if (active) onError(error);
        });
      return () => {
        active = false;
        stops.forEach((stop) => stop());
      };
    },
    async mutate(uid, input) {
      assertAccount(uid);
      const { db, firestore } = await client.getDatabase();
      assertAccount(uid);
      return firestore.runTransaction(db, async (transaction) => {
        assertAccount(uid);
        const billingRef = firestore.doc(
          db,
          "users",
          uid,
          "demoBilling",
          "current",
        );
        const receiptRef = firestore.doc(
          db,
          "users",
          uid,
          "demoReceipts",
          input.checkoutId,
        );
        const [billingDoc, receiptDoc] = await Promise.all([
          transaction.get(billingRef),
          transaction.get(receiptRef),
        ]);
        assertAccount(uid);
        const current = billingDoc.exists()
          ? parseBilling(billingDoc.data(), uid)
          : null;
        const existing = receiptDoc.exists()
          ? parseReceipt(receiptDoc.data(), uid)
          : null;
        if (
          (billingDoc.exists() && !current) ||
          (receiptDoc.exists() && !existing)
        )
          throw new Error("billing-invalid");
        const result = createBillingMutation(current, existing, input);
        if (!result.reused) {
          transaction.set(receiptRef, {
            ...result.receipt,
            committedAt: firestore.serverTimestamp(),
          });
          if (input.outcome === "success" && result.billing)
            transaction.set(billingRef, {
              ...result.billing,
              committedAt: firestore.serverTimestamp(),
            });
        }
        return { billing: result.billing, receipt: result.receipt };
      });
    },
  };
}

const guest: BillingSnapshot = {
  uid: "",
  status: "guest",
  billing: null,
  receipts: [],
  busy: false,
  online: true,
  error: "",
  isPro: false,
};
export function useBilling(user: { uid: string } | null) {
  const uid = user?.uid ?? "";
  const [snapshot, setSnapshot] = useState<BillingSnapshot>(guest);
  const [revision, setRevision] = useState(0);
  const session = useRef<BillingSession | null>(null);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  useEffect(() => {
    let active = true;
    let account: BillingSession | null = null;
    let unsubscribe = () => {};
    session.current = null;
    if (!uid) {
      setSnapshot({ ...guest, online: navigator.onLine });
      return;
    }
    setSnapshot({
      ...guest,
      uid,
      status: "checking",
      online: navigator.onLine,
    });
    void getFirebaseClient()
      .then((client) => {
        if (!active || currentUid.current !== uid) return;
        const cache = createBillingCache(client.projectId);
        account = new BillingSession(
          uid,
          createFirebaseBillingRepository(client),
          {
            online: navigator.onLine,
            cached: cache.read(uid),
            saveCache: cache.save,
          },
        );
        session.current = account;
        const publish = () => {
          if (active && currentUid.current === uid && account)
            setSnapshot(account.snapshot());
        };
        unsubscribe = account.subscribe(publish);
        publish();
      })
      .catch((error: unknown) => {
        if (active && currentUid.current === uid)
          setSnapshot({
            ...guest,
            uid,
            status: "error",
            online: navigator.onLine,
            error: error instanceof Error ? error.message : "billing-error",
          });
      });
    const connectivity = () => account?.setOnline(navigator.onLine);
    const focus = () => account?.tick();
    const timer = window.setInterval(focus, 1000);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      unsubscribe();
      account?.dispose();
      session.current = null;
      window.clearInterval(timer);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("focus", focus);
    };
  }, [uid, revision]);
  const activeSession = () =>
    currentUid.current && session.current?.snapshot().uid === currentUid.current
      ? session.current
      : null;
  const startTrial = useCallback(async () => {
    const expectedUid = currentUid.current;
    const result = await activeSession()?.startTrial();
    return currentUid.current === expectedUid && Boolean(result);
  }, []);
  const checkout = useCallback(
    async (plan: DemoPlan, outcome: DemoOutcome, checkoutId?: string) => {
      const expectedUid = currentUid.current;
      const result = await activeSession()?.checkout(plan, outcome, checkoutId);
      return currentUid.current === expectedUid ? (result ?? null) : null;
    },
    [],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const canUsePro = useCallback(() => {
    const active = activeSession();
    active?.tick();
    return active?.snapshot().isPro ?? false;
  }, []);
  const visible =
    snapshot.uid === uid
      ? snapshot
      : {
          ...guest,
          uid,
          status: uid ? ("checking" as const) : ("guest" as const),
        };
  return { ...visible, startTrial, checkout, refresh, canUsePro };
}
