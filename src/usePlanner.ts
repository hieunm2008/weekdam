import { useCallback, useEffect, useRef, useState } from 'react';
import { clone, emptyPlan, id, mergePlans, parseBackup, sameContent, type Plan } from './domain';
import { decodeRecords, diffRecords, encodeRecords, normalizeForSync, type CloudRecord } from './records';
import { acknowledge, loadAccount, loadPlan, saveAccount, savePlan, type PendingChange } from './storage';
import { firebaseConfigured, getFirebaseClient, type FirebaseClient } from './firebaseClient';

type Undo={patch:Map<string,CloudRecord|null>;label:string};
type Profile={uid:string;name:string};
type MergeRequest={guest:Plan;cloud:Plan};
export function usePlanner(){
  const [plan,setPlan]=useState<Plan>(emptyPlan),[ready,setReady]=useState(false),[error,setError]=useState('');
  const [notice,setNotice]=useState(''),[undoCount,setUndoCount]=useState(0),[online,setOnline]=useState(navigator.onLine);
  const [profile,setProfile]=useState<Profile|null>(null),[scope,setScope]=useState('guest'),[status,setStatus]=useState('localSaved'),[mergeRequest,setMergeRequest]=useState<MergeRequest|null>(null),[loginReady,setLoginReady]=useState(false);
  const current=useRef(plan),history=useRef<Undo[]>([]),queue=useRef<Promise<void>>(Promise.resolve()),key=useRef('guest');
  const client=useRef<FirebaseClient|null>(null),user=useRef<Profile|null>(null),epoch=useRef(0),pending=useRef(new Map<string,PendingChange>()),inflight=useRef(new Set<string>());
  const remote=useRef<CloudRecord[]>([]),serverSeen=useRef(false),sdkPending=useRef(false),migrated=useRef(false);
  const flushRef=useRef<()=>void>(()=>{});
  const show=useCallback((next:Plan)=>{current.current=next;setPlan(next);},[]);
  const overlay=useCallback(()=>{const records=new Map(remote.current.map(r=>[r.id,r]));for(const change of pending.current.values())records.set(change.record.id,change.record);return parseBackup(JSON.stringify(decodeRecords([...records.values()])));},[]);
  const refreshStatus=useCallback(()=>{setStatus(!user.current?'localSaved':pending.current.size||sdkPending.current?'pending':serverSeen.current?'synced':'connecting');},[]);
  const enqueue=useCallback((work:()=>Promise<void>)=>{queue.current=queue.current.catch(()=>{}).then(work);void queue.current.catch(()=>{setError('error');setStatus('syncError');});return queue.current;},[]);
  const flushPending=useCallback(()=>{
    const sdk=client.current,account=user.current,stamp=epoch.current,accountKey=key.current;
    if(!sdk||!account)return;
    const batch=[...pending.current.values()].filter(p=>!inflight.current.has(p.revision));if(!batch.length){refreshStatus();return;}
    batch.forEach(p=>inflight.current.add(p.revision));setStatus('pending');
    void sdk.write(account.uid,batch.map(p=>p.record)).then(async()=>{
      await acknowledge(accountKey,batch);
      if(stamp!==epoch.current)return;
      for(const change of batch)if(pending.current.get(change.record.id)?.revision===change.revision)pending.current.delete(change.record.id);
      batch.forEach(p=>inflight.current.delete(p.revision));const next=overlay();show(next);await enqueue(()=>savePlan(accountKey,next));refreshStatus();
    }).catch(()=>{batch.forEach(p=>inflight.current.delete(p.revision));if(stamp===epoch.current){setStatus('syncError');setError('syncError');}});
  },[enqueue,overlay,refreshStatus,show]);
  flushRef.current=flushPending;
  const persist=useCallback((input:Plan,markMigrated?:boolean)=>{
    const next=user.current?normalizeForSync(input):input,previous=current.current,accountKey=key.current,stamp=epoch.current;
    show(next);
    if(user.current){
      const changes=diffRecords(previous,next).map(record=>({revision:id(),record}));changes.forEach(change=>pending.current.set(change.record.id,change));
      setStatus(changes.length?'pending':status);
      void enqueue(()=>saveAccount(accountKey,next,changes,markMigrated)).then(()=>{if(stamp===epoch.current)flushRef.current();}).catch(()=>{});
    }else{setStatus('saving');void enqueue(()=>savePlan(accountKey,next)).then(()=>{if(stamp===epoch.current)setStatus('localSaved');}).catch(()=>{});}
  },[enqueue,show,status]);
  const resolveMerge=useCallback((useGuest:boolean)=>{
    const request=mergeRequest;if(!request)return;
    migrated.current=true;persist(useGuest?mergePlans(request.cloud,request.guest):request.cloud,true);setMergeRequest(null);setReady(true);
  },[mergeRequest,persist]);
  useEffect(()=>{
    let active=true,stopAuth=()=>{},stopWatch=()=>{};
    const openGuest=async(stamp=++epoch.current)=>{key.current='guest';user.current=null;setProfile(null);setScope('guest');setReady(false);show(emptyPlan());pending.current.clear();inflight.current.clear();setMergeRequest(null);
      const next=await loadPlan('guest');if(!active||stamp!==epoch.current)return;show(next);history.current=[];setUndoCount(0);setStatus('localSaved');setReady(true);
    };
    const boot=async()=>{
      if(!firebaseConfigured){await openGuest();return;}
      try{
        const sdk=await getFirebaseClient();if(!active)return;client.current=sdk;setLoginReady(true);
        stopAuth=sdk.watchAuth(async authUser=>{
          const stamp=++epoch.current;
          stopWatch();stopWatch=()=>{};
          try{
          if(!authUser){await openGuest(stamp);return;}
          const memoryGuest=key.current==='guest'?clone(current.current):null,accountKey='account:'+sdk.projectId+':'+authUser.uid;
          key.current=accountKey;user.current={uid:authUser.uid,name:authUser.displayName||authUser.email||'Google'};setProfile(user.current);setScope(accountKey);setReady(false);show(emptyPlan());history.current=[];setUndoCount(0);setMergeRequest(null);serverSeen.current=false;sdkPending.current=false;pending.current.clear();inflight.current.clear();
          await queue.current.catch(()=>{});const [cached,diskGuest]=await Promise.all([loadAccount(accountKey),loadPlan('guest')]);if(!active||stamp!==epoch.current)return;
          const guest=memoryGuest?.weeks.length?memoryGuest:diskGuest;
          migrated.current=cached.migrated;pending.current=new Map(cached.pending.map(p=>[p.record.id,p]));remote.current=encodeRecords(cached.plan);show(overlay());if(cached.migrated)setReady(true);setStatus('connecting');
          let confirmedServer=false;
          const cachedRecords=encodeRecords(cached.plan);
          stopWatch=sdk.watch(authUser.uid,(records,fromCache,hasPending)=>{
            if(!active||stamp!==epoch.current)return;
            if(fromCache&&!confirmedServer){const cache=new Map(cachedRecords.map(r=>[r.id,r]));for(const record of records)cache.set(record.id,record);remote.current=[...cache.values()];}else remote.current=records;
            if(!fromCache)confirmedServer=true;sdkPending.current=hasPending;serverSeen.current=!fromCache;
            try{
              const cloud=parseBackup(JSON.stringify(decodeRecords(records)));
              if(!migrated.current){
                if(fromCache)return;
                show(cloud);
                if(guest.weeks.some(w=>w.projects.length)&&cloud.weeks.some(w=>w.projects.length)){setMergeRequest({guest,cloud});setReady(true);return;}
                migrated.current=true;
                const merged=normalizeForSync(mergePlans(cloud,guest));const changes=diffRecords(cloud,merged).map(record=>({revision:id(),record}));changes.forEach(p=>pending.current.set(p.record.id,p));show(merged);
                void enqueue(()=>saveAccount(accountKey,merged,changes,true)).then(()=>{if(active&&stamp===epoch.current)flushRef.current();}).catch(()=>{});setReady(true);
              }else{const next=overlay();show(next);void enqueue(()=>savePlan(accountKey,next));setReady(true);}
              refreshStatus();
            }catch{setError('syncError');setStatus('syncError');setReady(true);}
          },()=>{if(active&&stamp===epoch.current){setError('syncError');setStatus('syncError');setReady(true);}});
          flushRef.current();
          }catch{if(active&&stamp===epoch.current){setError('error');setStatus('syncError');setReady(true);}}
        });
      }catch{if(active){await openGuest();setError('syncError');}}
    };
    void boot().catch(()=>{if(active){setError('error');setReady(true);}});
    return()=>{active=false;epoch.current++;stopAuth();stopWatch();};
  },[enqueue,overlay,refreshStatus,show]);
  useEffect(()=>{const update=()=>{setOnline(navigator.onLine);if(navigator.onLine)flushRef.current();};window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  const commit=useCallback((next:Plan,label='updated',undoable=true)=>{
    const normalized=user.current?normalizeForSync(next):next,before=new Map(encodeRecords(current.current).map(r=>[r.id,r])),after=new Map(encodeRecords(normalized).map(r=>[r.id,r])),patch=new Map<string,CloudRecord|null>();
    for(const entity of new Set([...before.keys(),...after.keys()]))if(!sameContent(before.get(entity),after.get(entity)))patch.set(entity,before.get(entity)??null);
    if(!patch.size)return;
    if(undoable){history.current.push({patch,label});history.current=history.current.slice(-20);setUndoCount(history.current.length);}
    persist(normalized);setNotice(label);setError('');
  },[persist]);
  const undo=useCallback(()=>{const entry=history.current.pop();if(!entry)return;const records=new Map(encodeRecords(current.current).map(r=>[r.id,r]));for(const [entity,record] of entry.patch){if(record)records.set(entity,record);else records.delete(entity);}persist(decodeRecords([...records.values()]));setUndoCount(history.current.length);setNotice('updated');},[persist]);
  const login=useCallback((language:string)=>{if(!client.current)return;void client.current.login(language).catch(()=>setError('syncError'));},[]);
  const logout=useCallback(async()=>{await queue.current.catch(()=>{});await client.current?.logout();},[]);
  return {plan,ready,error,setError,notice,setNotice,undoCount,undo,commit,online,scope,profile,status:online?status:'offline',configured:firebaseConfigured,loginReady,login,logout,mergeRequest,resolveMerge,flush:()=>queue.current};
}
