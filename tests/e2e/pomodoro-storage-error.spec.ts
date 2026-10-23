import { test, expect } from "@playwright/test";

test("reports a failed runtime read and retries without losing the saved timer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalGet = IDBObjectStore.prototype.get;
    Object.assign(window, {
      restorePomodoroReads: () => {
        IDBObjectStore.prototype.get = originalGet;
      },
    });
    IDBObjectStore.prototype.get = function (key) {
      if (key === "pomodoro:guest")
        throw new DOMException("Runtime read unavailable", "UnknownError");
      return originalGet.call(this, key);
    };
  });
  await page.goto("/app#pomodoro");
  await expect(
    page.getByTestId("pomodoro-page").getByRole("alert"),
  ).toContainText("Pomodoro");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("weekdam-local", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("meta", "readwrite");
        tx.objectStore("meta").put(
          {
            version: 1,
            revision: 9,
            phase: "focus",
            status: "paused",
            settings: {
              focusMinutes: 1,
              shortBreakMinutes: 5,
              longBreakMinutes: 15,
              longBreakEvery: 4,
              sound: true,
              notifications: false,
            },
            completedInCycle: 2,
            sessionId: "pomodoro-recovery",
            startedAt: Date.now() - 20_000,
            plannedDurationMs: 60_000,
            elapsedMs: 15_000,
          },
          "pomodoro:guest",
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
  await page.evaluate(() =>
    (
      window as unknown as { restorePomodoroReads: () => void }
    ).restorePomodoroReads(),
  );
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("00:45");
  await expect(
    page.getByTestId("pomodoro-page").getByRole("alert"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
});
