import { describe, expect, it } from 'vitest';
import * as domain from './domain';

describe('calendar in the planning timezone', () => {
  it('gives two devices the same identity for a newly created week',()=>{
    expect(domain.weekAt({version:1,weeks:[]},'2026-10-05').id).toBe(domain.weekAt({version:1,weeks:[]},'2026-10-05').id);
  });
  it('keeps local Monday across a UTC Sunday boundary', () => {
    expect(domain.today(new Date('2026-10-11T18:30:00Z'))).toBe('2026-10-12');
    expect(domain.weekStart('2027-01-01')).toBe('2026-12-28');
    expect(domain.shiftDate('2026-12-28', 7)).toBe('2027-01-04');
  });
  it('includes today in days remaining, with past/future boundaries', () => {
    expect(domain.daysLeft('2026-10-05', '2026-10-08')).toBe(4);
    expect(domain.daysLeft('2026-10-05', '2026-10-11')).toBe(1);
    expect(domain.daysLeft('2026-10-05', '2026-10-12')).toBe(0);
    expect(domain.daysLeft('2026-10-12', '2026-10-08')).toBe(7);
  });
});

describe('planner operations', () => {
  const fixture = () => ({ version: 1 as const, weeks: [{ id: 'w1', start: '2026-10-05', ended: false, projects: [
    { id: 'p1', name: 'Math', tasks: [{ id: 't1', name: 'Study', note: 'note', deadline: '2026-10-11', done: false, subtasks: [
      { id: 's1', day: 0, weight: 1 as const, note: 'easy', done: true, missed: [] },
      { id: 's2', day: 3, weight: 2 as const, note: 'medium', done: false, missed: [1] },
      { id: 's3', day: 3, weight: 3 as const, note: 'hard', done: false, missed: [] }
    ] }] }
  ] }] });
  it('uses difficulty units, including tasks without subtasks', () => {
    expect(domain.progress(fixture().weeks[0].projects)).toEqual({ done: 1, total: 6, percent: 17 });
    const f = fixture(); f.weeks[0].projects[0].tasks.push({ id:'t2', name:'Standalone', note:'', deadline:'', done:true, subtasks:[] });
    expect(domain.progress(f.weeks[0].projects)).toEqual({ done: 2, total: 7, percent: 29 });
  });
  it('copies selected projects as new IDs and resets progression by default', () => {
    const copied = domain.copyProjects(fixture().weeks[0].projects, false);
    expect(copied[0].id).not.toBe('p1');
    expect(copied[0].tasks[0].subtasks.every(s => !s.done && !s.missed.length)).toBe(true);
    expect(copied[0].tasks[0].deadline).toBe('2026-10-11');
    expect(domain.copyProjects(fixture().weeks[0].projects, true)[0].tasks[0].subtasks[0].done).toBe(true);
  });
  it('moves only the pending part when ending and appends to an existing destination', () => {
    const f = fixture();
    f.weeks.push({ id:'w2', start:'2026-10-12', ended:false, projects:[] });
    const ended = domain.endWeek(f, '2026-10-05', true);
    expect(ended.weeks[0].ended).toBe(true);
    expect(ended.weeks[0].projects[0].tasks[0].subtasks).toHaveLength(3);
    const pending = ended.weeks[1].projects[0].tasks[0].subtasks;
    expect(pending.map(s=>s.note)).toEqual(['medium','hard']);
    expect(pending.every(s=>!s.done && !s.missed.length)).toBe(true);
    expect(f.weeks[0].ended).toBe(false);
    expect(domain.endWeek(f, '2026-10-05', false).weeks[1].projects).toHaveLength(0);
  });
  it('rejects whole-week moves into occupied destinations and preserves IDs on valid moves', () => {
    const f=fixture();
    expect(domain.moveWeek(f,'2026-10-05','2026-10-12').weeks[0].start).toBe('2026-10-12');
    expect(domain.moveWeek(f,'2026-10-05','2026-10-12').weeks[0].projects[0].id).toBe('p1');
    f.weeks.push({...f.weeks[0],id:'w2',start:'2026-10-12'});
    expect(()=>domain.moveWeek(f,'2026-10-05','2026-10-12')).toThrow();
  });
  it('rejects corrupt imports and remaps conflicting IDs without losing either plan', () => {
    expect(()=>domain.parseBackup('{"version":1,"weeks":[{"start":"bad"}]}')).toThrow();
    expect(()=>domain.parseBackup(JSON.stringify({...fixture(),version:99}))).toThrow();
    const incoming=fixture(); incoming.weeks[0].projects[0].tasks[0].name='Changed';
    const merged=domain.mergePlans(fixture(),incoming);
    expect(merged.weeks[0].projects).toHaveLength(2);
    expect(merged.weeks[0].projects[1].id).not.toBe('p1');
    expect(domain.mergePlans(fixture(),fixture()).weeks[0].projects).toHaveLength(1);
  });
  it('rejects imported IDs that cannot be stored as a single document',()=>{
    const f=fixture();f.weeks[0].projects[0].id='invalid/path';
    expect(()=>domain.parseBackup(JSON.stringify(f))).toThrow();
  });
  it('deduplicates identical imported entities regardless of JSON property order',()=>{
    const incoming=fixture();const p=incoming.weeks[0].projects[0];incoming.weeks[0].projects[0]={tasks:p.tasks,name:p.name,id:p.id};
    expect(domain.mergePlans(fixture(),incoming).weeks[0].projects).toHaveLength(1);
  });
  it('aggregates statistics by units and breaks streaks across calendar gaps', () => {
    const f=fixture(); f.weeks[0].ended=true;
    const second=fixture().weeks[0]; second.id='w2'; second.start='2026-10-19'; second.ended=true;
    second.projects[0].tasks[0].subtasks.forEach(s=>s.done=true); f.weeks.push(second);
    const result=domain.statistics(f);
    expect(result.percent).toBe(58); expect(result.best?.start).toBe('2026-10-19'); expect(result.streak).toBe(1);
  });
});
