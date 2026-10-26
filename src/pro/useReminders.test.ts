import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "../domain";
import {
  createReminderMonitor,
  requestBrowserReminderPermission,
} from "./useReminders";
import type { ReminderItem } from "./reminders";

const now = Date.parse("2026-10-22T23:59:00+07:00");
const settings = {
  enabled: true,
  offsetsMinutes: [4320, 1440, 120],
  browserNotifications: true,
};
const plan: Plan = {
  version: 1,
  weeks: [
    {
      id: "w",
      start: "2026-10-19",
      ended: false,
      projects: [{ id: "p", name: "Toán", deadline: "2026-10-25", tasks: [] }],
    },
  ],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("reminder monitor", () => {
  it.each(["deleted", "completed", "rescheduled"])(
    "prunes %s reminders after expiry without generating new ones",
    async (change) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(now);
      let items: ReminderItem[] = [];
      const monitor = createReminderMonitor({
        uid: "expiry-prune-" + change,
        plan,
        settings: { ...settings, browserNotifications: false },
        entitled: true,
        onItems: (next) => {
          items = next;
        },
      });
      await monitor.scan(false);
      expect(items).toHaveLength(1);
      const replacement = structuredClone(plan);
      if (change === "deleted") replacement.weeks[0].projects = [];
      else if (change === "completed")
        replacement.weeks[0].projects[0].tasks = [
          { id: "completed", name: "Done", note: "", done: true, subtasks: [] },
        ];
      else replacement.weeks[0].projects[0].deadline = "2026-11-25";
      replacement.weeks[0].projects.push({
        ...structuredClone(plan.weeks[0].projects[0]),
        id: "new-project-after-expiry",
      });
      monitor.update({ plan: replacement, settings, entitled: false });
      await monitor.scan(false);
      expect(items).toEqual([]);
      monitor.stop();
    },
  );
  it("keeps a valid existing inbox after expiry without adding newly crossed milestones", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    let items: ReminderItem[] = [];
    const monitor = createReminderMonitor({
      uid: "expiry-keeps-existing",
      plan,
      settings: { ...settings, browserNotifications: false },
      entitled: true,
      onItems: (next) => {
        items = next;
      },
    });
    await monitor.scan(false);
    expect(items[0].offsetsMinutes).toEqual([4320]);
    vi.setSystemTime(now + 86400000 * 2);
    monitor.update({ plan, settings, entitled: false });
    await monitor.scan(false);
    expect(items).toHaveLength(1);
    expect(items[0].offsetsMinutes).toEqual([4320]);
    expect(items[0].createdAt).toBe(now);
    monitor.stop();
  });
  it("keeps in-app reminders working when browser notification permission is denied", async () => {
    let requests = 0;
    vi.stubGlobal(
      "Notification",
      class {
        static permission = "denied";
        static async requestPermission() {
          requests++;
          return "denied";
        }
      },
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    let items: ReminderItem[] = [];
    const monitor = createReminderMonitor({
      uid: "denied-monitor",
      plan,
      settings,
      entitled: true,
      onItems: (next) => {
        items = next;
      },
    });
    await monitor.scan(false);
    expect(items).toHaveLength(1);
    expect(requests).toBe(0);
    monitor.stop();
  });
  it("sends a single live browser notification for a claimed milestone and none on reopening", async () => {
    const titles: string[] = [];
    vi.stubGlobal(
      "Notification",
      class {
        static permission = "granted";
        constructor(title: string) {
          titles.push(title);
        }
      },
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const monitor = createReminderMonitor({
      uid: "live-monitor",
      plan,
      settings,
      entitled: true,
      onItems: () => {},
    });
    await monitor.scan(false);
    await monitor.scan(false);
    expect(titles).toEqual(["Toán"]);
    vi.setSystemTime(now + 2 * 86400000);
    await monitor.scan(true);
    expect(titles).toEqual(["Toán"]);
    monitor.stop();
  });
  it("suppresses an old account's in-flight state and browser effects after stopping", async () => {
    const titles: string[] = [];
    vi.stubGlobal(
      "Notification",
      class {
        static permission = "granted";
        constructor(title: string) {
          titles.push(title);
        }
      },
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    let published = false;
    const monitor = createReminderMonitor({
      uid: "cancelled-monitor",
      plan,
      settings,
      entitled: true,
      onItems: () => {
        published = true;
      },
    });
    const pending = monitor.scan(false);
    monitor.stop();
    await pending;
    expect(published).toBe(false);
    expect(titles).toEqual([]);
  });
  it("does not run reminder generation without entitlement", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    let items: ReminderItem[] = [];
    const monitor = createReminderMonitor({
      uid: "expired-monitor",
      plan,
      settings,
      entitled: false,
      onItems: (next) => {
        items = next;
      },
    });
    await monitor.scan(false);
    expect(items).toEqual([]);
    monitor.stop();
  });
  it("requests notification permission only through the explicit helper", async () => {
    let requests = 0;
    vi.stubGlobal(
      "Notification",
      class {
        static permission = "default";
        static async requestPermission() {
          requests++;
          return "denied";
        }
      },
    );
    expect(await requestBrowserReminderPermission()).toBe("denied");
    expect(requests).toBe(1);
  });
  it("rechecks entitlement when the scan executes even if the rendered permission was true", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    let items: ReminderItem[] = [];
    const monitor = createReminderMonitor({
      uid: "expired-execution-monitor",
      plan,
      settings,
      entitled: true,
      canUsePro: () => false,
      onItems: (next) => {
        items = next;
      },
    });
    await monitor.scan(false);
    expect(items).toEqual([]);
    monitor.stop();
  });
});
