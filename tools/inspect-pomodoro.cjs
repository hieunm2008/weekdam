const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const translations = {
  vi: require("../src/locales/vi.json"),
  en: require("../src/locales/en.json"),
};

const output = path.resolve(__dirname, "../docs/design/pomodoro-v1");
const baseURL = process.env.POMODORO_QA_URL || "http://127.0.0.1:4173/app";
const longTask =
  "Đọc và tổng hợp những ý tưởng quan trọng trong chương sách về cách xây dựng thói quen bền vững mỗi ngày, rồi viết lại các ví dụ để ôn tập vào cuối tuần";
const fixture = {
  version: 1,
  weeks: [
    {
      id: "week_2026-10-05",
      start: "2026-10-05",
      ended: false,
      projects: [
        {
          id: "pomodoro-qa-project",
          name: "Học tập, công việc và phát triển bản thân",
          tasks: [
            {
              id: "pomodoro-qa-task",
              name: longTask,
              note: "",
              done: false,
              subtasks: [
                {
                  id: "pomodoro-qa-step",
                  day: 6,
                  weight: 2,
                  note: "Ghi chép ba ý chính để thảo luận trong buổi học kế tiếp.",
                  done: false,
                  missed: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

async function route(page, label) {
  await page
    .getByRole("button", { name: label, exact: true })
    .filter({ visible: true })
    .click();
}

async function screenshot(page, name, reports) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const metrics = await page.evaluate(() => {
    const visible = (node) => node.getClientRects().length > 0;
    const buttons = [...document.querySelectorAll(".mobile-nav button")]
      .filter(visible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: node.textContent,
          width: rect.width,
          height: rect.height,
        };
      });
    const bar = document.querySelector(".pomodoro-minibar");
    const barBounds = bar ? bar.getBoundingClientRect().toJSON() : null;
    const nav = document.querySelector(".mobile-nav");
    const navBounds =
      nav && visible(nav) ? nav.getBoundingClientRect().toJSON() : null;
    const timerControls = document.querySelector(".pomodoro-controls");
    const timerControlsBounds = timerControls
      ? timerControls.getBoundingClientRect().toJSON()
      : null;
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      buttons,
      barBounds,
      navBounds,
      timerControlsBounds,
      timer: document.querySelector('[role="timer"]')?.textContent,
      footer: [...document.querySelectorAll(".card-footer.has-pomodoro")].map(
        (node) => ({
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        }),
      ),
    };
  });
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
  const accessibility = await new AxeBuilder({ page }).analyze();
  reports.push({
    screenshot: `${name}.png`,
    ...metrics,
    accessibilityViolations: accessibility.violations.length,
  });
  assert.deepEqual(
    accessibility.violations,
    [],
    `${name} accessibility violations`,
  );
  assert.equal(
    metrics.horizontalOverflow,
    false,
    `${name} overflows the viewport`,
  );
  for (const button of metrics.buttons) {
    assert.ok(
      button.width >= 44 && button.height >= 44,
      `${name} navigation target too small`,
    );
  }
  for (const footer of metrics.footer) {
    assert.ok(
      footer.scrollWidth <= footer.clientWidth + 1,
      `${name} card footer overflows`,
    );
  }
  if (metrics.barBounds && metrics.navBounds) {
    assert.ok(
      metrics.barBounds.bottom <= metrics.navBounds.top,
      `${name} minibar overlaps mobile navigation`,
    );
  }
  if (metrics.timerControlsBounds && metrics.navBounds) {
    assert.ok(
      metrics.timerControlsBounds.bottom <= metrics.navBounds.top,
      `${name} mobile navigation hides timer controls`,
    );
  }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const reports = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const theme of ["light", "dark"]) {
        for (const language of ["vi", "en"]) {
          const copy = translations[language];
          const name = `${width}-${theme}-${language}`;
          const context = await browser.newContext({
            viewport: { width, height: width >= 900 ? 900 : 844 },
            timezoneId: "Asia/Ho_Chi_Minh",
            isMobile: width < 900,
            hasTouch: width < 900,
          });
          try {
            const page = await context.newPage();
            await page.addInitScript((language) => {
              localStorage.setItem("weekdam:language", language);
            }, language);
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            await page.clock.install({
              time: new Date("2026-10-11T05:00:00Z"),
            });
            await page.goto(baseURL);
            await page.waitForLoadState("networkidle");
            await route(page, copy.settings);
            await page
              .getByLabel(copy.theme, { exact: true })
              .selectOption(theme);
            await page
              .getByRole("dialog")
              .getByRole("button", { name: copy.close, exact: true })
              .click();
            await route(page, copy.pomodoro);
            await page.getByTestId("pomodoro-page").waitFor();
            await screenshot(page, `${name}-free`, reports);

            await route(page, copy.settings);
            await page
              .getByRole("button", { name: copy.import, exact: true })
              .click();
            await page
              .getByLabel("JSON", { exact: true })
              .fill(JSON.stringify(fixture));
            await page
              .getByRole("button", { name: copy.merge, exact: true })
              .click();
            await page.getByRole("dialog").waitFor({ state: "hidden" });
            const dismiss = page.locator(".toast-dismiss");
            if (await dismiss.isVisible()) await dismiss.click();
            assert.equal(
              await page.getByLabel(copy.pomodoroTask, { exact: true }).count(),
              1,
              `${name} task selector must retain its accessible label after import`,
            );
            await page
              .getByLabel(copy.pomodoroTask, { exact: true })
              .selectOption("pomodoro-qa-task");
            await expect(
              page.getByLabel(copy.pomodoroTask, { exact: true }),
            ).toHaveValue("pomodoro-qa-task");
            await page
              .getByLabel(copy.pomodoroFocusMinutes, { exact: true })
              .fill("1");
            await page
              .getByRole("button", {
                name: copy.pomodoroSaveSettings,
                exact: true,
              })
              .click();
            await expect(page.getByRole("timer")).toHaveText("01:00");
            await page
              .getByRole("button", { name: copy.pomodoroStart, exact: true })
              .focus();
            await page.keyboard.press("Enter");
            await page
              .getByRole("button", { name: copy.pomodoroPause, exact: true })
              .waitFor();
            await page.clock.runFor(15_000);
            await page
              .getByRole("button", { name: copy.pomodoroPause, exact: true })
              .focus();
            await page.keyboard.press("Enter");
            await page
              .getByRole("button", { name: copy.pomodoroResume, exact: true })
              .waitFor();
            await screenshot(page, `${name}-long-task`, reports);
            await route(page, copy.plan);
            await page.getByTestId("pomodoro-minibar").waitFor();
            await page.getByTestId("day-work").waitFor();
            await screenshot(page, `${name}-minibar`, reports);
            await page
              .getByTestId("pomodoro-minibar")
              .getByRole("button", { name: copy.pomodoroResume, exact: true })
              .click();
            await page
              .getByTestId("pomodoro-minibar")
              .getByRole("button", { name: copy.pomodoroPause, exact: true })
              .waitFor();
            await page.clock.runFor(45_100);
            await route(page, copy.pomodoro);
            await page
              .getByRole("button", {
                name: copy.pomodoroNextShortBreak,
                exact: true,
              })
              .waitFor();
            assert.deepEqual(
              await page
                .locator(".pomodoro-summary > div > strong")
                .allTextContents(),
              [
                `1${copy.pomodoroMinutes}`,
                `1${copy.pomodoroSessionsUnit}`,
                `1${copy.pomodoroMinutes}`,
                `1${copy.pomodoroSessionsUnit}`,
              ],
              `${name} completed session must count toward today and seven-day summaries`,
            );
            await screenshot(page, `${name}-history`, reports);
            await page
              .getByRole("button", { name: copy.pomodoroReset, exact: true })
              .click();
            await page
              .getByRole("button", { name: copy.pomodoroStart, exact: true })
              .focus();
            await page.keyboard.press("Enter");
            await page
              .getByRole("button", { name: copy.pomodoroPause, exact: true })
              .waitFor();
            await page.clock.runFor(30_000);
            await page
              .getByRole("button", { name: copy.pomodoroStop, exact: true })
              .focus();
            await page.keyboard.press("Enter");
            await page
              .getByTestId("pomodoro-history")
              .locator("[data-session-id]")
              .nth(1)
              .waitFor();
            const partialMinutes = new Intl.NumberFormat(
              language === "vi" ? "vi-VN" : "en-GB",
              { maximumFractionDigits: 1 },
            ).format(1.5);
            assert.deepEqual(
              await page
                .locator(".pomodoro-summary > div > strong")
                .allTextContents(),
              [
                `${partialMinutes}${copy.pomodoroMinutes}`,
                `1${copy.pomodoroSessionsUnit}`,
                `${partialMinutes}${copy.pomodoroMinutes}`,
                `1${copy.pomodoroSessionsUnit}`,
              ],
              `${name} stopped focus must add time without increasing completed-session counts`,
            );
            await screenshot(page, `${name}-stopped-history`, reports);
            assert.deepEqual(errors, [], `${name} browser page errors`);
            process.stdout.write(
              `${name}: 5 screenshots, no overflow, no axe violations\n`,
            );
          } finally {
            await context.close();
          }
        }
      }
    }
    await fs.writeFile(
      path.join(output, "qa-report.json"),
      JSON.stringify(reports, null, 2) + "\n",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
