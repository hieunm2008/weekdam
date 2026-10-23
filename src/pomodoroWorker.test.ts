import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

interface WindowClient {
  url: string;
  focus: () => Promise<void>;
  postMessage: (message: unknown) => void;
}

function notificationWorker(windows: WindowClient[]) {
  const effects: unknown[] = [];
  let click: (event: {
    notification: { tag: string; close: () => void };
    waitUntil: (work: Promise<void>) => void;
  }) => void;
  runInNewContext(
    readFileSync(
      new URL("../public/pomodoro-notifications.js", import.meta.url),
      "utf8",
    ),
    {
      URL,
      self: {
        addEventListener: (type: string, handler: typeof click) => {
          if (type === "notificationclick") click = handler;
        },
        clients: {
          matchAll: async (options: unknown) => {
            effects.push({ matchAll: options });
            return windows;
          },
          openWindow: async (url: string) => {
            effects.push({ openWindow: url });
          },
        },
      },
    },
  );
  return {
    effects,
    async click(tag = "pomodoro-guest-7") {
      const work: Promise<void>[] = [];
      click!({
        notification: {
          tag,
          close: () => effects.push("close"),
        },
        waitUntil: (promise) => work.push(promise),
      });
      await Promise.all(work);
    },
  };
}

describe("Pomodoro notification clicks", () => {
  it("focuses the app window and asks it to show Pomodoro instead of opening a duplicate", async () => {
    const clientEffects: unknown[] = [];
    const worker = notificationWorker([
      {
        url: "https://weekdam.example/guide",
        focus: async () => {
          clientEffects.push("guide focus");
        },
        postMessage: (message) => clientEffects.push({ guide: message }),
      },
      {
        url: "https://weekdam.example/app/?week=2026-10-05",
        focus: async () => {
          clientEffects.push("app focus");
        },
        postMessage: (message) => clientEffects.push({ app: message }),
      },
    ]);
    await worker.click();
    expect(worker.effects).toEqual([
      "close",
      { matchAll: { type: "window", includeUncontrolled: true } },
    ]);
    expect(clientEffects).toEqual([
      "app focus",
      { app: { type: "OPEN_POMODORO" } },
    ]);
  });

  it("opens the Pomodoro deep link when no app window is available", async () => {
    const worker = notificationWorker([]);
    await worker.click();
    expect(worker.effects).toEqual([
      "close",
      { matchAll: { type: "window", includeUncontrolled: true } },
      { openWindow: "/app#pomodoro" },
    ]);
  });

  it("opens the app when only the website or a similarly named route is open", async () => {
    const clientEffects: unknown[] = [];
    const worker = notificationWorker(
      ["/", "/guide", "/app-guide"].map((path) => ({
        url: `https://weekdam.example${path}`,
        focus: async () => {
          clientEffects.push(path);
        },
        postMessage: (message: unknown) => clientEffects.push(message),
      })),
    );
    await worker.click();
    expect(worker.effects.at(-1)).toEqual({ openWindow: "/app#pomodoro" });
    expect(clientEffects).toEqual([]);
  });

  it("leaves notifications from other features alone", async () => {
    const worker = notificationWorker([]);
    await worker.click("weekly-summary");
    expect(worker.effects).toEqual([]);
  });
});
