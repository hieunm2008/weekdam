// Offline verification of research artifacts, not tests of the future app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workspace = path.resolve(root, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
let checks = 0;
function check(fn) { fn(); checks++; }
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() && e.name !== '.git' ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
}
for (const file of ['FEATURES.md','OPEN_QUESTIONS.md','DATA_MODEL.md','SESSION.md','screens/INDEX.md','evidence/environment.json']) {
  check(() => assert(fs.statSync(path.join(root,file)).size > 0, file));
}
const coverage = json('coverage.json');
check(() => assert.deepEqual(coverage.map(c=>c.id), Array.from({length:15},(_,i)=>i+1)));
for (const c of coverage) {
  check(() => assert(['verified','partial'].includes(c.status)));
  if(c.status==='partial') check(()=>assert(c.openQuestions?.length));
  for(const name of c.evidence) check(()=>assert(fs.existsSync(path.join(root,'screens',name)),name));
}
const pngs = fs.readdirSync(path.join(root,'screens')).filter(f=>f.endsWith('.png'));
for(const name of pngs) {
  const data=fs.readFileSync(path.join(root,'screens',name));
  check(()=>assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name));
  check(()=>assert.equal(data.readUInt32BE(16),name.startsWith('mobile-')?390:1440,name));
  check(()=>assert(data.readUInt32BE(20)>=(name.startsWith('mobile-')?844:900),name));
  check(()=>assert(fs.existsSync(path.join(root,'evidence',name.replace('.png','.txt'))),name));
}
for(const file of walk(workspace).filter(f=>f.endsWith('.md'))) {
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target=match[1];
    if(/^(https?:|#)/.test(target)) continue;
    check(()=>assert(fs.existsSync(path.resolve(path.dirname(file),target.split('#')[0])),`${file}: ${target}`));
  }
}
check(()=>assert(read('evidence/desktop-08-easy-complete.txt').includes('1/6 · 17%')));
check(()=>assert(read('evidence/desktop-09-hard-complete.txt').includes('4/6 · 67%')));
check(()=>assert(read('evidence/desktop-10-task-complete.txt').includes('6/6 · 100%')));
const before=json('evidence/guest-before-copy.json').weeks.find(w=>w.weekStart==='2026-10-05');
const pasted=json('evidence/guest-paste-default.json').weeks.find(w=>w.weekStart==='2026-10-12');
const copied=before.projects.flatMap(p=>p.tasks.flatMap(t=>t.subtasks));
const copies=pasted.projects.flatMap(p=>p.tasks.flatMap(t=>t.subtasks));
check(()=>assert.equal(copied.length,6));
check(()=>assert.equal(copies.length,6));
check(()=>assert(copies.every(s=>!s.isDone && s.missedDays.length===0)));
check(()=>assert(copies.every(s=>!copied.some(old=>old.id===s.id))));
check(()=>assert.equal(pasted.projects.find(p=>p.name==='Research Alpha').deadline,'2026-10-11'));
const repeated=json('evidence/guest-paste-repeated.json').weeks.find(w=>w.weekStart==='2026-10-12');
check(()=>assert.equal(repeated.projects.length,4));
check(()=>assert(repeated.projects.slice(2).flatMap(p=>p.tasks.flatMap(t=>t.subtasks)).some(s=>s.isDone)));
const moved=json('evidence/guest-move-work.json');
check(()=>assert(!moved.weeks.some(w=>w.weekStart==='2026-10-05')));
check(()=>assert.deepEqual(moved.weeks.find(w=>w.weekStart==='2026-09-28').projects,before.projects));
const carried=json('evidence/guest-ended-carried.json');
check(()=>assert(carried.weeks.find(w=>w.weekStart==='2026-10-05').ended));
check(()=>assert.equal(carried.weeks.find(w=>w.weekStart==='2026-10-12').projects.length,4));
const cleared=json('evidence/guest-end-clear-all.json');
check(()=>assert.deepEqual(cleared,carried)); // Reopen then Clear ends again without appending another carry.
const dateCases=json('evidence/date-cases.json');
check(()=>assert.equal(dateCases.length,9));
for(let i=1;i<=5;i++) check(()=>assert(dateCases[i].text.includes(`${7-i} days left`)));
check(()=>assert(!/\d+ days? left/.test(dateCases[0].text)));
check(()=>assert(!/\d+ days? left/.test(dateCases[6].text)));
check(()=>assert(dateCases[7].text.includes('Dec 28 – Jan 03')));
check(()=>assert(dateCases[8].text.includes('Jan 04 – Jan 10')));
const timezones=json('evidence/timezone-cases.json');
check(()=>assert(timezones.find(t=>t.timezone==='UTC').text.includes('Oct 05 – Oct 11')));
check(()=>assert(timezones.find(t=>t.timezone==='Asia/Ho_Chi_Minh').text.includes('Oct 12 – Oct 18')));
const settings=json('evidence/settings-reload.json');
for(const key of ['beaverplans:locale','beaverplans:theme','beaverplans:font','beaverplans.state.v1']) {
  check(()=>assert.equal(settings.before[key],settings.after[key]));
}
const stats=read('evidence/mobile-30-stats-two-weeks.txt');
check(()=>assert(stats.includes('67%\nAVG COMPLETION\n8 of 12 task units')));
check(()=>assert(stats.includes('2\nWEEK STREAK\nin a row at 50%+')));
check(()=>assert(stats.includes('7 task units completed in the last year')));
check(()=>assert(stats.includes('Thursday is your strongest day — 71%')));
const sameWeek=json('evidence/mobile-paste-same-week.json').weeks.find(w=>w.weekStart==='2026-10-19');
check(()=>assert.equal(sameWeek.projects.filter(p=>p.name==='Research Alpha').length,2));
const clearBoard=json('evidence/mobile-clear-board.json');
check(()=>assert(!clearBoard.weeks.some(w=>w.weekStart==='2026-10-19')));
check(()=>assert.equal(clearBoard.weeks.length,2));
check(()=>assert(clearBoard.weeks.every(w=>w.ended)));
console.log(JSON.stringify({status:'PASS',checks,baseline:coverage.length,fullyObserved:coverage.filter(c=>c.status==='verified').length,withExplicitLimits:coverage.filter(c=>c.status==='partial').length,screenshots:pngs.length,scope:'Research artifacts only; no weekdam app or physical Android tested'},null,2));
