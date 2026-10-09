import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { savePlan, loadPlan, saveAccount, loadAccount, acknowledge } from './storage';
it('persists the Guest plan separately from each account',async()=>{
  const local={version:1 as const,weeks:[]};
  const cloud={version:1 as const,weeks:[{id:'w',start:'2026-10-05',ended:false,projects:[]}]};
  await savePlan('guest',local); await savePlan('uid1',cloud);
  expect(await loadPlan('guest')).toEqual(local); expect(await loadPlan('uid1')).toEqual(cloud);
  expect(await loadPlan('uid2')).toEqual({version:1,weeks:[]});
});
it('keeps newer equal-valued edits pending when an older cloud acknowledgement arrives',async()=>{
  const record={id:'p',kind:'project' as const,parent:'week',order:0,deleted:false,value:{id:'p',name:'Study'}};
  const old={revision:'old',record},recent={revision:'recent',record};
  await saveAccount('account:demo:owner',{version:1,weeks:[]},[old],true);
  await saveAccount('account:demo:owner',{version:1,weeks:[]},[recent]);
  await acknowledge('account:demo:owner',[old]);
  const stored=await loadAccount('account:demo:owner');
  expect(stored.pending).toEqual([recent]);expect(stored.migrated).toBe(true);
  await acknowledge('account:demo:owner',[recent]);expect((await loadAccount('account:demo:owner')).pending).toEqual([]);
});
