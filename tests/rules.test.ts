import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,beforeEach,expect,it } from 'vitest';
import { initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc,setDoc,getDoc,getDocs,collection,serverTimestamp,deleteDoc } from 'firebase/firestore';
let env:RulesTestEnvironment;
const record=()=>({id:'p-study',kind:'project',parent:'week_2026-10-05',order:0,deleted:false,value:{id:'p-study',name:'Study'},updatedAt:serverTimestamp()});
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-weekdam',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});});
beforeEach(async()=>{await env.clearFirestore();});afterAll(async()=>{await env?.cleanup();});
it('lets the owner read, create, edit and tombstone records',async()=>{
  const db=env.authenticatedContext('owner').firestore(),ref=doc(db,'users/owner/records/p-study');
  await assertSucceeds(setDoc(ref,record()));await assertSucceeds(getDoc(ref));await assertSucceeds(getDocs(collection(db,'users/owner/records')));
  await assertSucceeds(setDoc(ref,{...record(),value:{id:'p-study',name:'Changed'}}));
  await assertSucceeds(setDoc(ref,{...record(),deleted:true,value:{id:'p-study'}}));
  expect((await getDoc(ref)).data()?.deleted).toBe(true);
});
it('denies unauthenticated clients and cross-account reads/writes',async()=>{
  await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'users/owner/records/p-study'),record()));
  for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('other').firestore()]){
    await assertFails(getDoc(doc(db,'users/owner/records/p-study')));await assertFails(getDocs(collection(db,'users/owner/records')));await assertFails(setDoc(doc(db,'users/owner/records/p-study'),record()));
  }
});
it('rejects unexpected fields, invalid values, forged IDs and client timestamps',async()=>{
  const db=env.authenticatedContext('owner').firestore(),ref=doc(db,'users/owner/records/p-study');
  await assertFails(setDoc(ref,{...record(),admin:true}));await assertFails(setDoc(ref,{...record(),id:'wrong'}));
  await assertFails(setDoc(ref,{...record(),updatedAt:new Date('2020-01-01')}));
  await assertFails(setDoc(ref,{...record(),kind:'subtask',value:{id:'p-study',day:10,weight:4,note:'',done:false,missed:[]}}));
  await assertFails(deleteDoc(ref));await assertFails(setDoc(doc(db,'public/p-study'),record()));
});
