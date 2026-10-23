import { afterEach, expect, it, vi } from "vitest";
import { enablePomodoroNotifications } from "./pomodoroAlerts";

afterEach(() => vi.unstubAllGlobals());
it("keeps notification permission denied without prompting again", async () => {
  vi.stubGlobal("Notification", {
    permission: "denied",
    requestPermission: () => {
      throw new Error("must not ask again");
    },
  });
  expect(await enablePomodoroNotifications()).toBe("denied");
});
it("allows the user to enable a previously unrequested notification permission", async () => {
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: async () => "granted",
  });
  expect(await enablePomodoroNotifications()).toBe("granted");
});
it("offers an in-app fallback when notification APIs are unavailable", async () => {
  vi.stubGlobal("Notification", undefined);
  expect(await enablePomodoroNotifications()).toBe("unsupported");
});
