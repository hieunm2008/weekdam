import {test,expect,type BrowserContext} from '@playwright/test';
async function account(context:BrowserContext,uid:string){const page=await context.newPage();await page.goto('http://127.0.0.1:4280/tests/fixtures/auth.html?uid='+uid);await page.waitForURL('http://127.0.0.1:4280/');await expect(page.getByTestId('sync-status')).toContainText('Đã đồng bộ',{timeout:15000});return page;}
test('syncs two devices, persists offline edits across reload, and isolates sign-out',async({browser})=>{
  const uid='owner-'+Date.now(),a=await browser.newContext(),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const desktop=await account(a,uid),phone=await account(b,uid);
  await desktop.getByRole('main').getByRole('button',{name:'Tạo dự án',exact:true}).click();await desktop.getByLabel('Tên dự án',{exact:true}).fill('Synced study');await desktop.getByRole('button',{name:'Lưu',exact:true}).click();
  await desktop.getByRole('button',{name:'Thêm công việc',exact:true}).first().click();await desktop.getByLabel('Tên công việc',{exact:true}).fill('Cross-device reading');await desktop.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(phone.getByTestId('day-work').getByText('Cross-device reading')).toBeVisible();
  await b.setOffline(true);await phone.getByTestId('day-work').getByRole('checkbox',{name:'Cross-device reading'}).check();await expect(phone.getByTestId('week-progress')).toContainText('100%');
  await phone.reload();await expect(phone.getByTestId('week-progress')).toContainText('100%');
  await b.setOffline(false);await expect(desktop.getByTestId('week-progress')).toContainText('100%');await expect(phone.getByTestId('sync-status')).toContainText('Đã đồng bộ');
  await phone.getByRole('button',{name:'Cài đặt',exact:true}).click();await phone.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await expect(phone.getByRole('main').getByRole('button',{name:'Tạo dự án',exact:true})).toBeVisible();await expect(phone.getByText('Synced study',{exact:true})).toHaveCount(0);
  await a.close();await b.close();
});
test('imports the saved Guest workspace after the authentication redirect reload',async({browser})=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:4280/');
  await page.getByRole('main').getByRole('button',{name:'Tạo dự án',exact:true}).click();await page.getByLabel('Tên dự án',{exact:true}).fill('Saved Guest work');await page.getByRole('button',{name:'Lưu',exact:true}).click();
  await page.goto('http://127.0.0.1:4280/tests/fixtures/auth.html?uid=guest-migration-'+Date.now());await page.waitForURL('http://127.0.0.1:4280/');
  await expect(page.getByTestId('sync-status')).toContainText('Đã đồng bộ');await expect(page.getByText('Saved Guest work',{exact:true})).toBeVisible();await context.close();
});
