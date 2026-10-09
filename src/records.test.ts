import { expect, it } from 'vitest';
import { encodeRecords, decodeRecords, normalizeForSync, diffRecords } from './records';
it('preserves independent subtask edits in records and hides descendants of deleted parents',()=>{
  const plan={version:1 as const,weeks:[{id:'w',start:'2026-10-05',ended:false,projects:[{id:'p',name:'Project',tasks:[{id:'t',name:'Task',note:'',done:false,subtasks:[{id:'s',day:3,weight:2 as const,note:'note',done:false,missed:[]}]}]}]}]};
  const records=encodeRecords(plan);
  expect(records).toHaveLength(4);
  expect(decodeRecords(records)).toEqual(plan);
  const edited=records.map(r=>r.id==='s'?{...r,value:{...r.value,done:true}}:r);
  expect(decodeRecords(edited).weeks[0].projects[0].tasks[0].subtasks[0].done).toBe(true);
  expect(decodeRecords(records.map(r=>r.id==='p'?{...r,deleted:true}:r)).weeks[0].projects).toHaveLength(0);
});
it('canonicalizes week identities and emits only changed or deleted entities',()=>{
  const original={version:1 as const,weeks:[{id:'imported-week',start:'2026-10-05',ended:false,projects:[{id:'p',name:'Project',tasks:[]}]}]};
  const normalized=normalizeForSync(original);expect(normalized.weeks[0].id).toBe('week_2026-10-05');expect(normalized.weeks[0].projects[0].id).toBe('p');
  const changed=structuredClone(normalized);changed.weeks[0].projects[0].name='Changed';
  expect(diffRecords(normalized,changed).map(r=>r.id)).toEqual(['p']);
  const removed=structuredClone(normalized);removed.weeks[0].projects=[];
  expect(diffRecords(normalized,removed)).toEqual([{id:'p',kind:'project',parent:'week_2026-10-05',order:0,deleted:true,value:{id:'p'}}]);
});
