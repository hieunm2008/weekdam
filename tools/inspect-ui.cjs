const {chromium}=require('@playwright/test');
const fs=require('node:fs/promises');
const root=require('node:path').resolve(__dirname,'../docs/validation/screens');
const start='2026-10-05';
const plan={version:1,weeks:[{id:'sample-week',start,ended:false,projects:[
  {id:'sample-study',name:'Học tiếng Anh',tasks:[
    {id:'sample-reading',name:'Đọc một chương sách',note:'',done:false,subtasks:[{id:'sample-read-mon',day:0,weight:2,note:'Ghi lại 5 ý chính',done:true,missed:[]},{id:'sample-read-thu',day:3,weight:1,note:'Ôn lại các từ mới',done:false,missed:[]}]},
    {id:'sample-practice',name:'Luyện nghe 20 phút',note:'',done:false,subtasks:[{id:'sample-listen-wed',day:2,weight:2,note:'Một tập podcast ngắn',done:false,missed:[]},{id:'sample-listen-fri',day:4,weight:2,note:'Nghe lại và ghi chú',done:false,missed:[]}]}
  ]},
  {id:'sample-personal',name:'Cuộc sống',tasks:[
    {id:'sample-walk',name:'Đi bộ ngoài trời',note:'',done:false,subtasks:[{id:'sample-walk-tue',day:1,weight:1,note:'30 phút, không điện thoại',done:true,missed:[]},{id:'sample-walk-sat',day:5,weight:1,note:'Đi một con đường mới',done:false,missed:[]}]},
    {id:'sample-reset',name:'Chuẩn bị tuần mới',note:'',done:false,subtasks:[{id:'sample-reset-sun',day:6,weight:1,note:'Nhìn lại và chọn 3 việc quan trọng',done:false,missed:[]}]}
  ]}
] }]};
(async()=>{
  await fs.mkdir(root,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const [name,width,height,touch] of [['desktop',1440,900,false],['mobile',390,844,true]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1,timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-08T05:00:00Z'));await page.goto('http://127.0.0.1:4173');
    await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByRole('button',{name:'Nhập JSON',exact:true}).click();
    await page.getByLabel('JSON',{exact:true}).fill(JSON.stringify(plan));await page.getByRole('button',{name:'Gộp dữ liệu',exact:true}).click();
    await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
    await page.screenshot({path:root+'/weekdam-'+name+'.png',fullPage:true});
    await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByLabel('Giao diện',{exact:true}).selectOption('dark');await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
    await page.screenshot({path:root+'/weekdam-'+name+'-dark.png',fullPage:true});await context.close();
  }
  await browser.close();console.log('Four application screenshots saved');
})().catch(e=>{console.error(e);process.exitCode=1;});
