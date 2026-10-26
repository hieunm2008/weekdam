import type { User } from "firebase/auth";
import type { CloudRecord } from "./records";
import { createWriteQueue } from "./writeQueue";
import { resolveFirebaseConfig } from "./firebaseConfig";
const config = resolveFirebaseConfig(import.meta.env);
export const emulatorMode = config.emulatorMode;
export const firebaseConfigured = config.configured;
let instance: Promise<FirebaseClient> | undefined;
export type FirebaseClient = Awaited<ReturnType<typeof initializeClient>>;
export function getFirebaseClient() {
  if (!instance)
    instance = initializeClient().catch((error) => {
      instance = undefined;
      throw error;
    });
  return instance;
}
async function initializeClient() {
  const [appModule, authModule] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  const projectId = config.projectId;
  if (!firebaseConfigured || (emulatorMode && !projectId.startsWith("demo-")))
    throw new Error("firebase-configuration");
  const app = appModule.initializeApp({
    projectId,
    apiKey:
      import.meta.env.VITE_FIREBASE_API_KEY || (emulatorMode ? "demo-key" : ""),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "localhost",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app",
  });
  const auth = authModule.initializeAuth(app, {
    persistence: authModule.indexedDBLocalPersistence,
  });
  if (emulatorMode) {
    authModule.connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }
  await auth.authStateReady();
  type Database = {
    firestore: typeof import("firebase/firestore");
    db: import("firebase/firestore").Firestore;
  };
  let database: Promise<Database> | undefined;
  const getDatabase = () => {
    if (!database)
      database = import("firebase/firestore")
        .then((firestore) => {
          const db = firestore.initializeFirestore(app, {
            localCache: firestore.persistentLocalCache({
              tabManager: firestore.persistentMultipleTabManager(),
            }),
          });
          if (emulatorMode)
            firestore.connectFirestoreEmulator(db, "127.0.0.1", 8080);
          return { firestore, db };
        })
        .catch((error) => {
          database = undefined;
          throw error;
        });
    return database;
  };
  return {
    projectId,
    auth,
    getDatabase,
    watchAuth: (callback: (user: User | null) => void) =>
      authModule.onAuthStateChanged(auth, callback),
    login: (language: string) => {
      auth.languageCode = language;
      const provider = new authModule.GoogleAuthProvider();
      return authModule.signInWithPopup(
        auth,
        provider,
        authModule.browserPopupRedirectResolver,
      );
    },
    logout: () => authModule.signOut(auth),
    watch: (
      uid: string,
      callback: (
        records: CloudRecord[],
        cached: boolean,
        pending: boolean,
      ) => void,
      onError: () => void,
    ) => {
      let active = true;
      let stop = () => {};
      void getDatabase()
        .then(({ firestore, db }) => {
          if (!active) return;
          stop = firestore.onSnapshot(
            firestore.collection(db, "users", uid, "records"),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (active)
                callback(
                  snapshot.docs.map(
                    (doc) => ({ ...doc.data(), id: doc.id }) as CloudRecord,
                  ),
                  snapshot.metadata.fromCache,
                  snapshot.metadata.hasPendingWrites,
                );
            },
            () => {
              if (active) onError();
            },
          );
        })
        .catch(() => {
          if (active) onError();
        });
      return () => {
        active = false;
        stop();
      };
    },
    write: createWriteQueue<CloudRecord>(async (uid, records) => {
      const { firestore, db } = await getDatabase();
      for (let offset = 0; offset < records.length; offset += 100) {
        const batch = firestore.writeBatch(db);
        for (const record of records.slice(offset, offset + 100))
          batch.set(firestore.doc(db, "users", uid, "records", record.id), {
            ...record,
            updatedAt: firestore.serverTimestamp(),
          });
        await batch.commit();
      }
    }),
  };
}
