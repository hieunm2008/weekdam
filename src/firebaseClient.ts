import type { User } from 'firebase/auth';
import type { CloudRecord } from './records';
export const emulatorMode=import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true';
export const firebaseConfigured=emulatorMode||Boolean(import.meta.env.VITE_FIREBASE_API_KEY&&import.meta.env.VITE_FIREBASE_PROJECT_ID&&import.meta.env.VITE_FIREBASE_AUTH_DOMAIN&&import.meta.env.VITE_FIREBASE_APP_ID);
let instance:Promise<FirebaseClient>|undefined;
export type FirebaseClient=Awaited<ReturnType<typeof initializeClient>>;
export function getFirebaseClient(){if(!instance)instance=initializeClient().catch(error=>{instance=undefined;throw error;});return instance;}
async function initializeClient(){
  const [appModule,authModule,firestore]=await Promise.all([import('firebase/app'),import('firebase/auth'),import('firebase/firestore')]);
  const projectId=import.meta.env.VITE_FIREBASE_PROJECT_ID||(emulatorMode?'demo-weekdam':'');
  if(!firebaseConfigured||(emulatorMode&&!projectId.startsWith('demo-')))throw new Error('firebase-configuration');
  const app=appModule.initializeApp({projectId,apiKey:import.meta.env.VITE_FIREBASE_API_KEY||(emulatorMode?'demo-key':''),authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'localhost',appId:import.meta.env.VITE_FIREBASE_APP_ID||'demo-app'});
  const auth=authModule.getAuth(app),db=firestore.initializeFirestore(app,{localCache:firestore.persistentLocalCache({tabManager:firestore.persistentMultipleTabManager()})});
  if(emulatorMode){authModule.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});firestore.connectFirestoreEmulator(db,'127.0.0.1',8080);}
  await authModule.setPersistence(auth,authModule.indexedDBLocalPersistence);
  void authModule.getRedirectResult(auth).catch(()=>{});
  return {
    projectId,
    auth,
    watchAuth:(callback:(user:User|null)=>void)=>authModule.onAuthStateChanged(auth,callback),
    login:(language:string)=>{auth.languageCode=language;const provider=new authModule.GoogleAuthProvider();return authModule.signInWithPopup(auth,provider);},
    logout:()=>authModule.signOut(auth),
    watch:(uid:string,callback:(records:CloudRecord[],cached:boolean,pending:boolean)=>void,onError:()=>void)=>firestore.onSnapshot(firestore.collection(db,'users',uid,'records'),{includeMetadataChanges:true},snapshot=>callback(snapshot.docs.map(doc=>({...doc.data(),id:doc.id}) as CloudRecord),snapshot.metadata.fromCache,snapshot.metadata.hasPendingWrites),onError),
    write:async(uid:string,records:CloudRecord[])=>{
      for(let offset=0;offset<records.length;offset+=100){const batch=firestore.writeBatch(db);for(const record of records.slice(offset,offset+100))batch.set(firestore.doc(db,'users',uid,'records',record.id),{...record,updatedAt:firestore.serverTimestamp()});await batch.commit();}
    }
  };
}
