import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Plan } from "../../src/domain";
import type { PendingChange } from "../../src/storage";
import { glassPlan, loadGlass, ordered, keyboardMove } from "../fixtures/glass";

const appURL = "http://127.0.0.1:4280";
const boardDate = new Date("2026-10-08T05:00:00Z");
const initialOrder = ["Alpha", "Beta 1", "Gamma", "Beta 2"];

async function synced(page: Page) {
  await expect(page.getByTestId("sync-status")).toContainText("Đã đồng bộ", {
    timeout: 15000,
  });
}

async function signIn(page: Page, uid: string) {
  // The Auth fixture needs a current token timestamp; the board uses Thursday.
  await page.clock.setFixedTime(new Date());
  await page.goto(`${appURL}/tests/fixtures/auth.html?uid=${uid}`);
  await page.waitForURL(`${appURL}/app`);
  await page.clock.setFixedTime(boardDate);
  await page.reload();
  await synced(page);
}

async function account(context: BrowserContext, uid: string) {
  const page = await context.newPage();
  await signIn(page, uid);
  return page;
}

async function deviceContexts(browser: Browser) {
  const desktop = await browser.newContext({
    baseURL: appURL,
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const phone = await browser.newContext({
    baseURL: appURL,
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Ho_Chi_Minh",
    isMobile: true,
    hasTouch: true,
  });
  return { desktop, phone };
}

async function importBackup(page: Page, backup: Plan) {
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Nhập JSON", exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(backup));
  await page.getByRole("button", { name: "Gộp dữ liệu", exact: true }).click();
}

async function exportBackup(page: Page): Promise<Plan> {
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
  const download = await downloaded;
  const path = await download.path();
  if (!path) throw new Error("Backup download missing");
  const backup = JSON.parse(await readFile(path, "utf8")) as Plan;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  return backup;
}

function steps(plan: Plan) {
  return plan.weeks.flatMap((week) =>
    week.projects.flatMap((project) =>
      project.tasks.flatMap((task) => task.subtasks),
    ),
  );
}

async function storedRank(page: Page, uid: string, id: string, rank: number) {
  // Wait for the real local plan and outbox transaction before reloading offline.
  await expect
    .poll(async () => {
      const saved = await page.evaluate(async (key) => {
        return new Promise<{ plan?: Plan; pending: PendingChange[] }>(
          (resolve, reject) => {
            const request = indexedDB.open("weekdam-local", 2);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction(["plans", "outbox"], "readonly");
              const plan = tx.objectStore("plans").get(key);
              const pending = tx.objectStore("outbox").get(key);
              tx.oncomplete = () => {
                db.close();
                resolve({ plan: plan.result, pending: pending.result ?? [] });
              };
              tx.onerror = () => {
                db.close();
                reject(tx.error);
              };
            };
          },
        );
      }, `account:demo-weekdam:${uid}`);
      return {
        rank:
          saved.plan &&
          steps(saved.plan).find((step) => step.id === id)?.dayOrder,
        pendingRank: saved.pending.find((change) => change.record.id === id)
          ?.record.value.dayOrder,
      };
    })
    .toEqual({ rank, pendingRank: rank });
}

test("syncs global day order across projects on desktop and mobile after reload", async ({
  browser,
}) => {
  const uid = `glass-order-${Date.now()}`;
  const contexts = await deviceContexts(browser);
  try {
    const desktop = await account(contexts.desktop, uid);
    const phone = await account(contexts.phone, uid);
    await loadGlass(desktop);
    await ordered(desktop, initialOrder);
    await ordered(phone, initialOrder);
    await synced(desktop);
    await synced(phone);

    await keyboardMove(desktop, "glass-c", "ArrowUp");
    for (const page of [desktop, phone]) {
      await ordered(page, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
      await synced(page);
    }

    await keyboardMove(phone, "glass-c", "ArrowUp");
    for (const page of [desktop, phone]) {
      await ordered(page, ["Gamma", "Alpha", "Beta 1", "Beta 2"]);
      await synced(page);
      await page.reload();
      await ordered(page, ["Gamma", "Alpha", "Beta 1", "Beta 2"]);
    }
    await ordered(desktop, ["Alpha"], 4);
  } finally {
    await contexts.desktop.close();
    await contexts.phone.close();
  }
});

test("persists an offline mobile keyboard reorder through reload and syncs it after reconnect", async ({
  browser,
}) => {
  const uid = `glass-offline-${Date.now()}`;
  const contexts = await deviceContexts(browser);
  try {
    const desktop = await account(contexts.desktop, uid);
    const phone = await account(contexts.phone, uid);
    await loadGlass(desktop);
    await ordered(phone, initialOrder);
    await synced(desktop);
    await synced(phone);
    await phone.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await contexts.phone.setOffline(true);
    await keyboardMove(phone, "glass-b1", "ArrowUp");
    await ordered(phone, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
    await expect(phone.getByTestId("sync-status")).toContainText(
      "Đang offline",
    );
    await storedRank(phone, uid, "glass-b1", 512);
    await ordered(desktop, initialOrder);

    await phone.reload();
    await ordered(phone, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
    await expect(phone.getByTestId("sync-status")).toContainText(
      "Đang offline",
    );
    await storedRank(phone, uid, "glass-b1", 512);
    await contexts.phone.setOffline(false);

    for (const page of [phone, desktop]) {
      await synced(page);
      await ordered(page, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
    }
    await desktop.reload();
    await ordered(desktop, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
  } finally {
    await contexts.desktop.close();
    await contexts.phone.close();
  }
});

test("converges independent offline moves into the same rank gap by ID without losing cards", async ({
  browser,
}) => {
  const uid = `glass-collision-${Date.now()}`;
  const contexts = await deviceContexts(browser);
  try {
    const desktop = await account(contexts.desktop, uid);
    const phone = await account(contexts.phone, uid);
    const collisionPlan = glassPlan();
    collisionPlan.weeks[0].projects[0].tasks[0].subtasks[0].id = "glass-z";
    await importBackup(desktop, collisionPlan);
    await ordered(desktop, initialOrder);
    await ordered(phone, initialOrder);
    await synced(desktop);
    await synced(phone);
    await contexts.desktop.setOffline(true);
    await contexts.phone.setOffline(true);

    // Both clients insert between Beta 1 (2048) and Gamma (3072).
    // The edits affect separate subtask documents, so both must survive.
    await keyboardMove(desktop, "glass-z", "ArrowDown");
    await keyboardMove(phone, "glass-b2", "ArrowUp");
    await ordered(desktop, ["Beta 1", "Alpha", "Gamma", "Beta 2"]);
    await ordered(phone, ["Alpha", "Beta 1", "Beta 2", "Gamma"]);
    await storedRank(desktop, uid, "glass-z", 2560);
    await storedRank(phone, uid, "glass-b2", 2560);

    await Promise.all([
      contexts.desktop.setOffline(false),
      contexts.phone.setOffline(false),
    ]);
    for (const page of [desktop, phone]) {
      await synced(page);
      // glass-b2 sorts before glass-z, opposing the project hierarchy.
      await ordered(page, ["Beta 1", "Beta 2", "Alpha", "Gamma"]);
      expect(
        await page
          .locator('[data-day="3"] [data-step-id]')
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-step-id")),
          ),
      ).toEqual(["glass-b1", "glass-b2", "glass-z", "glass-c"]);
      const backup = await exportBackup(page);
      expect(
        steps(backup).find((step) => step.id === "glass-z")?.dayOrder,
      ).toBe(2560);
      expect(
        steps(backup).find((step) => step.id === "glass-b2")?.dayOrder,
      ).toBe(2560);
      expect(
        steps(backup)
          .map((step) => step.id)
          .sort(),
      ).toEqual(["glass-b1", "glass-b2", "glass-c", "glass-other", "glass-z"]);
      await page.reload();
      await ordered(page, ["Beta 1", "Beta 2", "Alpha", "Gamma"]);
    }
    await ordered(desktop, ["Alpha"], 4);
  } finally {
    await contexts.desktop.close();
    await contexts.phone.close();
  }
});

test("retains reordered backup imports through Guest migration and sync without duplicates", async ({
  browser,
  page,
}) => {
  await loadGlass(page);
  await keyboardMove(page, "glass-c", "ArrowUp");
  await ordered(page, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
  const backup = await exportBackup(page);
  expect(backup.version).toBe(1);
  expect(steps(backup).find((step) => step.id === "glass-c")?.dayOrder).toBe(
    1536,
  );

  const uid = `glass-guest-import-${Date.now()}`;
  const contexts = await deviceContexts(browser);
  try {
    const guest = await contexts.phone.newPage();
    await guest.clock.setFixedTime(boardDate);
    await guest.goto("/app");
    await importBackup(guest, backup);
    await ordered(guest, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
    await importBackup(guest, backup);
    await ordered(guest, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
    await expect(guest.getByTestId("sync-status")).toContainText(
      "Đã lưu trên thiết bị",
    );
    await guest.reload();
    await ordered(guest, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);

    await signIn(guest, uid);
    await ordered(guest, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
    const desktop = await account(contexts.desktop, uid);
    await ordered(desktop, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
    const migrated = await exportBackup(desktop);
    expect(
      steps(migrated)
        .map((step) => step.id)
        .sort(),
    ).toEqual(["glass-a", "glass-b1", "glass-b2", "glass-c", "glass-other"]);
    expect(
      steps(migrated).every((step) => Number.isFinite(step.dayOrder)),
    ).toBe(true);
    await ordered(desktop, ["Alpha"], 4);
    await guest.reload();
    await ordered(guest, ["Alpha", "Gamma", "Beta 1", "Beta 2"]);
  } finally {
    await contexts.desktop.close();
    await contexts.phone.close();
  }
});

test("resolves conflicting offline moves of the same subtask by the last committed write", async ({
  browser,
}) => {
  const uid = `glass-same-subtask-${Date.now()}`;
  const contexts = await deviceContexts(browser);
  const firstOrder = ["Alpha", "Gamma", "Beta 1", "Beta 2"];
  const lastOrder = ["Alpha", "Beta 1", "Beta 2", "Gamma"];
  try {
    const desktop = await account(contexts.desktop, uid);
    const phone = await account(contexts.phone, uid);
    await loadGlass(desktop);
    for (const page of [desktop, phone]) {
      await ordered(page, initialOrder);
      await synced(page);
    }

    await contexts.desktop.setOffline(true);
    await contexts.phone.setOffline(true);
    // Both edits start at Gamma's original rank, but update the same document.
    await keyboardMove(desktop, "glass-c", "ArrowUp");
    await keyboardMove(phone, "glass-c", "ArrowDown");
    await ordered(desktop, firstOrder);
    await ordered(phone, lastOrder);
    await storedRank(desktop, uid, "glass-c", 1536);
    await storedRank(phone, uid, "glass-c", 5120);

    await contexts.desktop.setOffline(false);
    await synced(desktop);
    await ordered(desktop, firstOrder);
    expect(
      steps(await exportBackup(desktop)).find((step) => step.id === "glass-c")
        ?.dayOrder,
    ).toBe(1536);
    await ordered(phone, lastOrder);
    await storedRank(phone, uid, "glass-c", 5120);

    // Reconnect only after the desktop's first write is acknowledged.
    await contexts.phone.setOffline(false);
    for (const page of [phone, desktop]) {
      await synced(page);
      await ordered(page, lastOrder);
      expect(
        steps(await exportBackup(page)).find((step) => step.id === "glass-c")
          ?.dayOrder,
      ).toBe(5120);
      await page.reload();
      await synced(page);
      await ordered(page, lastOrder);
    }
  } finally {
    await contexts.desktop.close();
    await contexts.phone.close();
  }
});
