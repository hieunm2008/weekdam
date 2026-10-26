import { expect, test, type BrowserContext } from "@playwright/test";
const appURL = "http://127.0.0.1:4280";
async function open(context: BrowserContext, uid: string) {
  const page = await context.newPage();
  await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
  await page.waitForURL(`${appURL}/app`);
  await page.goto(`${appURL}/tests/fixtures/pro.html`);
  await expect(page.locator("#status")).toHaveText("Ready");
  return page;
}
test("round-trips simulated Pro billing and all five planning features across two devices", async ({ browser }) => {
  test.setTimeout(90_000);
  const uid = `pro-roundtrip-${Date.now()}`;
  const firstContext = await browser.newContext({ serviceWorkers: "block", timezoneId: "Asia/Ho_Chi_Minh" });
  const secondContext = await browser.newContext({ serviceWorkers: "block", timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const first = await open(firstContext, uid);
    const second = await open(secondContext, uid);
    const checkoutId = `pro-checkout-${Date.now()}`;
    const [one, two] = await Promise.all([
      first.evaluate(id => (window as any).proFixture.checkout(id), checkoutId),
      second.evaluate(id => (window as any).proFixture.checkout(id), checkoutId),
    ]);
    expect(one.receipt.checkoutId).toBe(checkoutId);
    expect(two.billing.expiresAt).toBe(one.billing.expiresAt);
    expect(one.billing.expiresAt).toBe(Date.parse("2026-11-23T08:00:00+07:00"));
    const seeded = await first.evaluate(() => (window as any).proFixture.seed());
    expect(seeded).toMatchObject({ duplicateIgnored: true, examMinutes: 100, recurrenceCount: 4 });
    const inspected = await second.evaluate(() => (window as any).proFixture.inspect());
    expect(inspected.plan).toEqual(seeded.plan);
    expect(inspected.plan.pro.templates).toHaveLength(1);
    expect(inspected.plan.pro.recurrenceRules).toHaveLength(1);
    expect(inspected.plan.pro.appliedOperations).toHaveLength(3);
    expect(inspected.report).toMatchObject({ plannedMinutes: 440, focusedMinutes: 10, differenceMinutes: -430 });
    expect(inspected.csv).toContain("Giải tích");
    expect(inspected.reminders.length).toBeGreaterThan(0);
    expect(inspected.reminders.every((item: any) => item.missed)).toBe(true);
    const removedId = await first.evaluate(() => (window as any).proFixture.tombstoneFirstOccurrence());
    await second.reload();
    await expect(second.locator("#status")).toHaveText("Ready");
    const reloaded = await second.evaluate(() => (window as any).proFixture.inspect());
    expect(reloaded.plan.weeks.flatMap((week: any) => week.projects.flatMap((project: any) => project.tasks)).some((task: any) => task.id === removedId)).toBe(false);
    expect((await second.evaluate(() => (window as any).proFixture.billing())).expiresAt).toBe(one.billing.expiresAt);
    expect(reloaded.plan.pro.appliedOperations).toHaveLength(3);
  } finally { await firstContext.close(); await secondContext.close(); }
});
