import { expect, test, type Page } from "@playwright/test";

interface AudioObservation {
  rings: number;
  contexts: AudioContextState[];
  suppressedIntervals: number;
}

async function observeAudio(
  page: Page,
  throttleCompletion = false,
  blockSignals = false,
) {
  await page.addInitScript(
    ({ throttleCompletion, blockSignals }) => {
      const observation = {
        rings: 0,
        contexts: [] as AudioContext[],
        suppressedIntervals: 0,
      };
      Object.assign(window, { pomodoroAudioObservation: observation });
      if (blockSignals) {
        const NativeChannel = BroadcastChannel;
        window.BroadcastChannel = class extends NativeChannel {
          constructor(name: string) {
            super(name);
            this.addEventListener("message", (event) =>
              event.stopImmediatePropagation(),
            );
          }
        };
        document.addEventListener = new Proxy(document.addEventListener, {
          apply(target, receiver, args) {
            if (args[0] === "visibilitychange") return;
            return Reflect.apply(target, receiver, args);
          },
        });
      }
      const NativeAudioContext = AudioContext;
      const createOscillator = NativeAudioContext.prototype.createOscillator;
      NativeAudioContext.prototype.createOscillator = function () {
        const oscillator = createOscillator.call(this);
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          start(when);
          observation.rings++;
        };
        return oscillator;
      };
      window.AudioContext = new Proxy(NativeAudioContext, {
        construct(target, args, newTarget) {
          const context = Reflect.construct(
            target,
            args,
            newTarget,
          ) as AudioContext;
          observation.contexts.push(context);
          return context;
        },
      });
      if (throttleCompletion) {
        const setInterval = window.setInterval.bind(window);
        window.setInterval = ((
          callback: TimerHandler,
          delay?: number,
          ...args: unknown[]
        ) =>
          setInterval(
            typeof callback === "function" && delay === 1000
              ? () => {
                  observation.suppressedIntervals++;
                }
              : callback,
            delay,
            ...args,
          )) as typeof window.setInterval;
      }
    },
    { throttleCompletion, blockSignals },
  );
}

async function audioObservation(page: Page): Promise<AudioObservation> {
  return page.evaluate(() => {
    const observation = (
      window as unknown as {
        pomodoroAudioObservation: {
          rings: number;
          contexts: AudioContext[];
          suppressedIntervals: number;
        };
      }
    ).pomodoroAudioObservation;
    return {
      rings: observation.rings,
      contexts: observation.contexts.map((context) => context.state),
      suppressedIntervals: observation.suppressedIntervals,
    };
  });
}

async function openTimer(page: Page) {
  await page.goto("/app#pomodoro");
  await expect(page.getByRole("timer")).toBeVisible();
}

test("rings once in the primed tab when an unprimed tab wins completion, without replay after reload", async ({
  page,
  context,
}) => {
  test.setTimeout(30_000);
  await page.clock.install({ time: new Date("2026-10-11T05:00:00Z") });
  await observeAudio(page, true);
  await openTimer(page);
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await audioObservation(page)).contexts)
    .toContain("running");

  // The context clock must run while the second app loads its lazy modules.
  await page.clock.resume();
  const second = await context.newPage();
  await observeAudio(second);
  await openTimer(second);
  await expect(
    second.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  expect((await audioObservation(second)).contexts).toEqual([]);
  const now = await second.evaluate(() => Date.now());
  await second.clock.pauseAt(new Date(now + 1000));
  await second.clock.runFor(60_100);
  await expect(
    second.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  await expect(
    second.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  expect((await audioObservation(page)).suppressedIntervals).toBeGreaterThan(0);
  await expect.poll(async () => (await audioObservation(page)).rings).toBe(1);
  expect((await audioObservation(second)).rings).toBe(0);

  // Further invalidations cannot replay the committed phase's chime.
  await page.evaluate(() => {
    const channel = new BroadcastChannel("weekdam:pomodoro");
    channel.postMessage({ scope: "guest", revision: 999 });
    channel.close();
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await second.clock.runFor(2000);
  expect((await audioObservation(page)).rings).toBe(1);
  expect((await audioObservation(second)).rings).toBe(0);
  await page.clock.resume();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  expect((await audioObservation(page)).rings).toBe(0);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
});

test("rings when a stale action learns that another tab already completed the phase", async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date("2026-10-11T05:00:00Z") });
  await observeAudio(page, true, true);
  await openTimer(page);
  await page.getByLabel("Tập trung (phút)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Lưu thời gian", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("01:00");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await audioObservation(page)).contexts)
    .toContain("running");
  const second = await context.newPage();
  await observeAudio(second);
  await openTimer(second);
  await expect(
    second.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  const now = await second.evaluate(() => Date.now());
  await second.clock.pauseAt(new Date(now + 1000));
  await second.clock.runFor(60_100);
  await expect(
    second.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dừng phiên", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bắt đầu nghỉ ngắn", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await audioObservation(page)).rings).toBe(1);
  await expect(
    page.getByTestId("pomodoro-history").locator("[data-session-id]"),
  ).toHaveCount(1);
  expect((await audioObservation(second)).rings).toBe(0);
});
