import { openDB } from 'idb';
import { emptyPlan, parseBackup, type Plan } from './domain';
import type { CloudRecord } from './records';
export interface PendingChange {revision:string;record:CloudRecord}
export interface AccountState {plan:Plan;pending:PendingChange[];migrated:boolean}
const database=()=>openDB('weekdam-local',2,{upgrade(db){for(const name of ['plans','outbox','meta'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name);}});
export async function loadPlan(key:string):Promise<Plan>{const db=await database();try{const data=await db.get('plans',key);return data?parseBackup(JSON.stringify(data)):emptyPlan();}finally{db.close();}}
export async function savePlan(key:string,plan:Plan):Promise<void>{const db=await database();try{await db.put('plans',plan,key);}finally{db.close();}}
export async function loadAccount(key:string):Promise<AccountState>{
  const db=await database();try{const [plan,pending,migrated]=await Promise.all([db.get('plans',key),db.get('outbox',key),db.get('meta',key)]);return {plan:plan?parseBackup(JSON.stringify(plan)):emptyPlan(),pending:pending??[],migrated:migrated===true};}finally{db.close();}
}
export async function saveAccount(key:string,plan:Plan,changes:PendingChange[],migrated?:boolean):Promise<void>{
  const db=await database();try{const tx=db.transaction(['plans','outbox','meta'],'readwrite');const existing:PendingChange[]=await tx.objectStore('outbox').get(key)??[];const pending=new Map(existing.map(p=>[p.record.id,p]));for(const change of changes)pending.set(change.record.id,change);
    await Promise.all([tx.objectStore('plans').put(plan,key),tx.objectStore('outbox').put([...pending.values()],key),...(migrated===undefined?[]:[tx.objectStore('meta').put(migrated,key)])]);await tx.done;
  }finally{db.close();}
}
export async function acknowledge(key:string,changes:PendingChange[]):Promise<void>{
  const db=await database();try{const tx=db.transaction('outbox','readwrite');const existing:PendingChange[]=await tx.store.get(key)??[];const acknowledged=new Map(changes.map(p=>[p.record.id,p.revision]));await tx.store.put(existing.filter(p=>acknowledged.get(p.record.id)!==p.revision),key);await tx.done;}finally{db.close();}
}
