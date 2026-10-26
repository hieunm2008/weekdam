import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import type { Plan } from "../../src/domain";
import type { PendingChange } from "../../src/storage";
import { glassPlan, loadGlass } from "../fixtures/glass";

const appURL = "http://127.0.0.1:4280";
const sessionId = "glass-b1";

async function synced(page: Page) {
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 15000,
  });
}

async function account(context: BrowserContext, uid: string) {
  const page = await context.newPage();
  // Authenticate with a current token before fixing the planner to Thursday.
  await page.clock.setFixedTime(new Date());
  await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
  await page.waitForURL(`${appURL}/app`);
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:00Z"));
  await page.reload();
  await synced(page);
  return page;
}

function sessionEditor(page: Page, start: string, end: string) {
  return page.getByRole("button", {
    name: `Sửa lịch Beta 1 · ${start}–${end}`,
    exact: true,
  });
}

async function editTimes(
  page: Page,
  beforeStart: string,
  beforeEnd: string,
  start: string,
  end: string,
) {
  const edit = sessionEditor(page, beforeStart, beforeEnd);
  await edit.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest" }),
  );
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: "Xếp lịch công việc",
    exact: true,
  });
  await dialog.getByLabel("Giờ bắt đầu", { exact: true }).fill(start);
  await dialog.getByLabel("Giờ kết thúc", { exact: true }).fill(end);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function savedSession(page: Page, uid: string) {
  const saved = await page.evaluate(async (key) => {
    return new Promise<{ plan?: Plan; pending: PendingChange[] }>(
      (resolve, reject) => {
        const request = indexedDB.open("weekdam-local", 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(["plans", "outbox"], "readonly");
          const plan = transaction.objectStore("plans").get(key);
          const pending = transaction.objectStore("outbox").get(key);
          transaction.oncomplete = () => {
            db.close();
            resolve({ plan: plan.result, pending: pending.result ?? [] });
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      },
    );
  }, `account:demo-weekdam-pro:${uid}`);
  const step = saved.plan?.weeks
    .flatMap((week) =>
      week.projects.flatMap((project) =>
        project.tasks.flatMap((task) => task.subtasks),
      ),
    )
    .find((item) => item.id === sessionId);
  const pending = saved.pending.find(
    (change) => change.record.id === sessionId,
  );
  return {
    startTime: step?.startTime ?? null,
    endTime: step?.endTime ?? null,
    hasStart: !!step && "startTime" in step,
    hasEnd: !!step && "endTime" in step,
    pendingStart: pending?.record.value.startTime ?? null,
    pendingEnd: pending?.record.value.endTime ?? null,
  };
}

test("syncs paired session times across devices and retains offline edits through reload and clearing", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const uid = `calendar-sync-${Date.now()}`;
  const desktopContext = await browser.newContext({
    baseURL: appURL,
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const phoneContext = await browser.newContext({
    baseURL: appURL,
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Ho_Chi_Minh",
    isMobile: true,
    hasTouch: true,
  });
  try {
    const desktop = await account(desktopContext, uid);
    const phone = await account(phoneContext, uid);
    const sample = glassPlan();
    const step = sample.weeks[0].projects[1].tasks[0].subtasks[0];
    step.startTime = "09:00";
    step.endTime = "10:30";
    await loadGlass(desktop, false, sample);
    await expect(phone.locator(`[data-step-id="${sessionId}"]`)).toHaveCount(1);
    for (const page of [desktop, phone]) {
      await page
        .getByRole("button", { name: "Lịch theo giờ", exact: true })
        .click();
      await expect(sessionEditor(page, "09:00", "10:30")).toHaveCount(1);
      await synced(page);
    }

    await editTimes(desktop, "09:00", "10:30", "10:15", "11:45");
    for (const page of [desktop, phone]) {
      await expect(sessionEditor(page, "10:15", "11:45")).toHaveCount(1);
      await synced(page);
    }
    await phone.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await phoneContext.setOffline(true);
    await editTimes(phone, "10:15", "11:45", "14:00", "15:30");
    const offlineTimes = {
      startTime: "14:00",
      endTime: "15:30",
      hasStart: true,
      hasEnd: true,
      pendingStart: "14:00",
      pendingEnd: "15:30",
    };
    // Wait for the real plan/outbox transaction, then reload without a network.
    await expect.poll(() => savedSession(phone, uid)).toEqual(offlineTimes);
    await expect(sessionEditor(desktop, "10:15", "11:45")).toHaveCount(1);
    await phone.reload();
    await expect(sessionEditor(phone, "14:00", "15:30")).toHaveCount(1);
    await expect(phone.getByTestId("sync-status")).toContainText(
      "Đang offline",
    );
    await expect.poll(() => savedSession(phone, uid)).toEqual(offlineTimes);

    await phoneContext.setOffline(false);
    for (const page of [phone, desktop]) {
      await expect(sessionEditor(page, "14:00", "15:30")).toHaveCount(1);
      await synced(page);
    }
    const edit = sessionEditor(phone, "14:00", "15:30");
    await edit.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await edit.click();
    await phone
      .getByRole("dialog", { name: "Xếp lịch công việc", exact: true })
      .getByRole("button", {
        name: "Bỏ giờ, giữ công việc trong ngày",
        exact: true,
      })
      .click();

    for (const page of [phone, desktop]) {
      await expect(
        page
          .getByRole("region", { name: "Công việc chưa có giờ", exact: true })
          .locator(`[data-calendar-step-id="${sessionId}"]`),
      ).toHaveCount(1);
      await expect(sessionEditor(page, "14:00", "15:30")).toHaveCount(0);
      await synced(page);
      await expect
        .poll(() => savedSession(page, uid))
        .toEqual({
          startTime: null,
          endTime: null,
          hasStart: false,
          hasEnd: false,
          pendingStart: null,
          pendingEnd: null,
        });
    }
    await desktop.reload();
    await expect(
      desktop
        .getByRole("region", { name: "Công việc chưa có giờ", exact: true })
        .locator(`[data-calendar-step-id="${sessionId}"]`),
    ).toHaveCount(1);
    await synced(desktop);
  } finally {
    await desktopContext.close();
    await phoneContext.close();
  }
});
