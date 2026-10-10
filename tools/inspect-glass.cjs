const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

const currentStart = "2026-10-05";
const fixedTime = "2026-10-08T05:00:00Z";
const sizes = [
  [1440, 900, false],
  [1366, 768, false],
  [390, 844, true],
  [320, 844, true],
];
const representatives = new Set([
  "1440x900-light-vi",
  "1366x768-dark-en",
  "390x844-light-vi",
  "320x844-dark-en",
]);
const detailCases = new Set(["1440x900-light-vi", "320x844-dark-en"]);

function step(
  id,
  day,
  dayOrder,
  weight = 1,
  done = false,
  note = "",
  missed = [],
) {
  return { id, day, dayOrder, weight, done, note, missed };
}
function task(id, name, subtasks, deadline, note = "") {
  return {
    id,
    name,
    note,
    done: subtasks.length > 0 && subtasks.every((item) => item.done),
    subtasks,
    ...(deadline ? { deadline } : {}),
  };
}
function richPlan() {
  const history = [
    ["2026-08-24", [1, 2, 1, 2, 3, 1, 2], 4],
    ["2026-08-31", [3, 3, 2, 2, 2, 1, 1], 5],
    ["2026-09-07", [2, 3, 3, 2, 3, 1, 2], 2],
    ["2026-09-14", [2, 3, 1, 2, 1, 1, 2], 4],
    ["2026-09-21", [3, 2, 3, 2, 2, 3, 3], 5],
    ["2026-09-28", [3, 2, 3, 3, 1, 2, 2], 4],
  ].map(([start, weights, doneCount], wi) => {
    const projects = [
      { id: `qa-history-${wi}-study`, name: "Học tập & phát triển", tasks: [] },
      { id: `qa-history-${wi}-life`, name: "Cuộc sống / Personal", tasks: [] },
    ];
    weights.forEach((weight, i) => {
      const id = `qa-history-${wi}-${i}`;
      projects[i % 2].tasks.push(
        task(
          id + "-task",
          [
            "Đọc sách và ghi chép",
            "Prepare the weekly review",
            "Đi bộ ngoài trời",
          ][i % 3],
          [
            step(
              id + "-step",
              i % 7,
              (Math.floor(i / 7) + 1) * 1024,
              weight,
              i < doneCount,
              "Một bước nhỏ trong tuần đã kết thúc",
              [],
            ),
          ],
        ),
      );
    });
    return { id: "week_" + start, start, ended: true, projects };
  });
  const current = {
    id: "week_" + currentStart,
    start: currentStart,
    ended: false,
    projects: [
      {
        id: "qa-study",
        name: "Học tập & ngoại ngữ",
        tasks: [
          task(
            "qa-long-vi",
            "Đọc và tổng hợp những ý tưởng quan trọng trong chương sách về cách xây dựng thói quen bền vững mỗi ngày",
            [
              step(
                "qa-vi-thu-1",
                3,
                1024,
                2,
                false,
                "Đọc phần đầu, gạch chân ba ý chính và viết một ví dụ của riêng mình.",
                [1],
              ),
              step(
                "qa-vi-thu-2",
                3,
                4096,
                1,
                true,
                "Tóm tắt bằng năm câu ngắn.",
              ),
              step(
                "qa-vi-thu-3",
                3,
                8192,
                3,
                false,
                "Ôn lại nội dung và giải thích cho một người bạn.",
              ),
              step("qa-vi-mon", 0, 1024, 2, true, "Chuẩn bị tài liệu."),
            ],
            "2026-10-07T18:00",
            "Ba bước cùng tên trên thứ Năm; mỗi bước có độ khó và ghi chú riêng.\nGiữ thời gian nghỉ giữa các phiên tập trung.",
          ),
          task("qa-listen", "Luyện nghe 20 phút và ghi lại những từ mới", [
            step(
              "qa-listen-thu",
              3,
              5120,
              2,
              false,
              "Nghe một tập podcast, sau đó nghe lại không nhìn transcript.",
            ),
            step(
              "qa-listen-tue",
              1,
              1024,
              1,
              false,
              "Buổi nghe chưa hoàn thành từ thứ Ba.",
            ),
          ]),
        ],
      },
      {
        id: "qa-work",
        name: "Công việc & dự án cá nhân",
        deadline: "2026-10-09T17:30",
        tasks: [
          task(
            "qa-long-en",
            "Prepare a thoughtful accessibility review and a clear implementation proposal for the next release of the planning experience",
            [
              step(
                "qa-en-thu",
                3,
                2048,
                3,
                false,
                "Check keyboard flow, touch targets, contrast, and long content on a narrow phone.",
                [2],
              ),
              step(
                "qa-en-tue",
                1,
                2048,
                2,
                false,
                "Collect findings from the previous review.",
              ),
            ],
            "2026-10-07T16:00",
            "Summarize findings with concrete examples and a short list of next steps.",
          ),
          task("qa-review", "Rà soát bản nháp và gửi phản hồi cho nhóm", [
            step(
              "qa-review-thu",
              3,
              6144,
              1,
              false,
              "Tập trung vào các điểm cần quyết định.",
            ),
            step(
              "qa-review-fri",
              4,
              1024,
              2,
              false,
              "Đọc lại sau khi nhóm cập nhật.",
            ),
          ]),
          task(
            "qa-unscheduled",
            "Ý tưởng cho tuần tới / Ideas for next week",
            [],
            undefined,
            "Chưa chọn ngày; hiển thị trong trình quản lý dự án.",
          ),
        ],
      },
      {
        id: "qa-life",
        name: "Cuộc sống & sức khỏe",
        tasks: [
          task("qa-dinner", "Chuẩn bị bữa tối cùng gia đình", [
            step("qa-dinner-thu", 3, 3072, 1, true),
          ]),
          task("qa-walk", "Đi bộ ngoài trời, không mang theo điện thoại", [
            step("qa-walk-thu", 3, 7168, 2, false),
            step("qa-walk-sat", 5, 1024, 1, true),
          ]),
          task("qa-reset", "Dọn góc làm việc và chọn ba ưu tiên cho tuần mới", [
            step("qa-reset-thu", 3, 9216, 1, false),
            step("qa-reset-sun", 6, 1024, 2, false),
          ]),
        ],
      },
    ],
  };
  return { version: 1, weeks: [...history, current] };
}
function sparsePlan() {
  return {
    version: 1,
    weeks: [
      {
        id: "week_" + currentStart,
        start: currentStart,
        ended: false,
        projects: [
          {
            id: "qa-sparse",
            name: "Từng việc nhỏ / Small steps",
            tasks: [
              task("qa-sparse-task", "Đi bộ 20 phút / Take a short walk", [
                step("qa-sparse-thu", 3, 1024),
              ]),
            ],
          },
        ],
      },
    ],
  };
}
function summary(plan) {
  const ended = plan.weeks.filter((week) => week.ended);
  const allSteps = (weeks) =>
    weeks.flatMap((week) =>
      week.projects.flatMap((project) =>
        project.tasks.flatMap((item) => item.subtasks),
      ),
    );
  const history = allSteps(ended);
  return {
    weeks: plan.weeks.length,
    endedWeeks: ended.length,
    historyDone: history
      .filter((item) => item.done)
      .reduce((sum, item) => sum + item.weight, 0),
    historyTotal: history.reduce((sum, item) => sum + item.weight, 0),
    historyWeeks: ended.map((week) => {
      const rows = allSteps([week]);
      return [
        rows.reduce((sum, item) => sum + item.weight, 0),
        rows
          .filter((item) => item.done)
          .reduce((sum, item) => sum + item.weight, 0),
      ];
    }),
    currentThursdayCards: allSteps(
      plan.weeks.filter((week) => !week.ended),
    ).filter((item) => item.day === 3).length,
  };
}
function checkFixture() {
  const plan = richPlan();
  assert.deepEqual(summary(plan), {
    weeks: 7,
    endedWeeks: 6,
    historyDone: 54,
    historyTotal: 88,
    historyWeeks: [
      [12, 6],
      [14, 12],
      [16, 5],
      [12, 8],
      [18, 12],
      [16, 11],
    ],
    currentThursdayCards: 9,
  });
  const ids = [];
  for (const week of plan.weeks) {
    ids.push(week.id);
    for (const project of week.projects) {
      ids.push(project.id);
      for (const item of project.tasks) {
        ids.push(item.id);
        for (const subtask of item.subtasks) {
          ids.push(subtask.id);
          assert.ok(Number.isFinite(subtask.dayOrder) && subtask.dayOrder >= 0);
          assert.ok([1, 2, 3].includes(subtask.weight));
          assert.ok(subtask.day >= 0 && subtask.day <= 6);
        }
      }
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  return summary(plan);
}

async function closeDialog(page, labels) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: labels.close, exact: true })
    .click();
}
async function importPlan(page, labels, plan) {
  await page
    .getByRole("button", { name: labels.settings, exact: true })
    .click();
  await page.getByRole("button", { name: labels.import, exact: true }).click();
  await page.getByLabel("JSON", { exact: true }).fill(JSON.stringify(plan));
  await page.getByRole("button", { name: labels.merge, exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const notice = page.locator(".toast-dismiss");
  if (await notice.isVisible()) await notice.click();
}
async function navigate(page, mobile, labels, route) {
  await page
    .locator(mobile ? ".mobile-nav" : ".desktop-nav")
    .getByRole("button", { name: labels[route], exact: true })
    .click();
}
async function capture(
  page,
  directory,
  name,
  state,
  records,
  fullPage = false,
  simulation = false,
) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await document.fonts.load('16px "Inter Variable"', "Tiếng Việt và English");
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const measured = await page.evaluate(() => {
    const root = document.documentElement;
    const visible = (node) => node.getClientRects().length > 0;
    const toolbarNodes = [
      ...document.querySelectorAll(
        ".page-header,.week-toolbar,.mobile-nav,dialog[open]",
      ),
    ].filter(visible);
    const toolbarOverflow = Math.max(
      0,
      ...toolbarNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return Math.max(
          -rect.left,
          rect.right - innerWidth,
          node.scrollWidth - node.clientWidth,
        );
      }),
    );
    const card = document.querySelector("[data-step-id] .task-title");
    const cardSurface = document.querySelector("[data-step-id]");
    const scrolls = [
      ...document.querySelectorAll(
        ".week-scroll,.week-chart,.activity-scroll,.day-tabs",
      ),
    ]
      .filter(visible)
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => ({
        class: node.className,
        width: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
    return {
      viewport: [innerWidth, innerHeight],
      pageSize: [root.scrollWidth, root.scrollHeight],
      overflowPx: Math.max(0, root.scrollWidth - innerWidth),
      toolbarOverflowPx: Math.ceil(toolbarOverflow),
      scrollers: scrolls,
      fonts: {
        status: document.fonts.status,
        inter: document.fonts.check(
          '16px "Inter Variable"',
          "Tiếng Việt và English",
        ),
        family: getComputedStyle(card || document.body).fontFamily,
        faces: [...document.fonts]
          .filter((font) => font.family.includes("Inter"))
          .map((font) => font.status),
      },
      theme: root.dataset.theme,
      language: root.lang,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      backdropSupported: CSS.supports("backdrop-filter", "blur(1px)"),
      card: cardSurface
        ? {
            fontSize: getComputedStyle(card).fontSize,
            backdrop: getComputedStyle(cardSurface).backdropFilter,
            background: getComputedStyle(cardSurface).backgroundColor,
            transition: getComputedStyle(cardSurface).transitionDuration,
          }
        : null,
      thursdayCards: document.querySelectorAll('[data-day="3"] [data-step-id]')
        .length,
      statsTotals:
        document
          .querySelector(".stat-strip > div:first-child p")
          ?.textContent?.trim() || null,
      statsFigures: [
        ...document.querySelectorAll(".stat-strip > div > strong"),
      ].map((node) => node.textContent.trim()),
    };
  });
  const file = path.join(directory, `${name}-${state}.png`);
  await page.screenshot({ path: file, fullPage, animations: "disabled" });
  records.push({
    case: name,
    state,
    file,
    fullPage,
    ...(simulation ? { noBlurSimulation: true } : {}),
    ...measured,
  });
}

async function main() {
  const fixture = checkFixture();
  if (process.argv.includes("--check")) {
    console.log(
      JSON.stringify({ fixture, combinations: 16, expectedScreenshots: 36 }),
    );
    return;
  }
  const target = new URL(process.env.GLASS_BASE_URL || "http://127.0.0.1:4300");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    !["http:", "https:"].includes(target.protocol)
  ) {
    throw new Error("GLASS_BASE_URL must point to a local app server");
  }
  const directory = path.resolve(
    process.env.GLASS_OUTPUT_DIR ||
      path.join(__dirname, "../docs/design/glass-v1/rendered"),
  );
  await fs.mkdir(directory, { recursive: true });
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const records = [];
  const pageErrors = [];
  try {
    for (const [width, height, mobile] of sizes)
      for (const theme of ["light", "dark"])
        for (const language of ["vi", "en"]) {
          const name = `${width}x${height}-${theme}-${language}`;
          const labels = require(`../src/locales/${language}.json`);
          const context = await browser.newContext({
            baseURL: target.href,
            viewport: { width, height },
            isMobile: mobile,
            hasTouch: mobile,
            deviceScaleFactor: 1,
            timezoneId: "Asia/Ho_Chi_Minh",
            serviceWorkers: "block",
          });
          try {
            // Each case is an isolated Guest workspace; block external account traffic.
            await context.route("**/*", (route) => {
              const url = new URL(route.request().url());
              return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
                ? route.continue()
                : route.abort();
            });
            await context.addInitScript(
              ({ theme, language, start }) => {
                localStorage.setItem("weekdam:theme", theme);
                localStorage.setItem("weekdam:language", language);
                localStorage.setItem("weekdam:guide", "no");
                localStorage.setItem("weekdam:viewed-week", start);
              },
              { theme, language, start: currentStart },
            );
            const page = await context.newPage();
            page.setDefaultTimeout(15000);
            page.on("pageerror", (error) =>
              pageErrors.push({ case: name, message: error.message }),
            );
            await page.clock.setFixedTime(new Date(fixedTime));
            await page.goto(target.href);
            await importPlan(page, labels, richPlan());
            await page.locator('[data-step-id="qa-vi-thu-1"]').waitFor();
            await capture(page, directory, name, "board-dense", records);

            if (representatives.has(name)) {
              await navigate(page, mobile, labels, "stats");
              await page.locator(".stats-page").waitFor();
              assert.deepEqual(
                (
                  await page
                    .locator(".stat-strip > div > strong")
                    .allTextContents()
                ).map((text) => text.trim()),
                ["61%", "86%", "3", "6"],
                "The real Stats view must compute the approved fixture totals",
              );
              await capture(page, directory, name, "stats", records, true);
              await navigate(page, mobile, labels, "weeks");
              await page.locator(".week-history").first().waitFor();
              await capture(page, directory, name, "weeks", records, true);
              await navigate(page, mobile, labels, "plan");
              await page
                .locator('[data-step-id="qa-vi-thu-1"] .task-title')
                .click();
              await page.getByRole("dialog").waitFor();
              await capture(page, directory, name, "editor", records);
              await closeDialog(page, labels);
            }
            if (detailCases.has(name)) {
              await page
                .getByRole("button", { name: labels.settings, exact: true })
                .click();
              await page.getByRole("dialog").waitFor();
              await capture(page, directory, name, "settings", records);
              await closeDialog(page, labels);
              await page
                .getByRole("main")
                .getByRole("button", { name: labels.projects, exact: true })
                .click();
              await page.locator(".project-title").first().waitFor();
              await capture(page, directory, name, "projects", records);
              await closeDialog(page, labels);

              await page.emulateMedia({ reducedMotion: "reduce" });
              // Execute the actual fallback cascade; this is not an unsupported engine.
              const fallbackRules = await page.evaluate(() => {
                const found = Array.from(document.styleSheets)
                  .flatMap((sheet) => Array.from(sheet.cssRules))
                  .find(
                    (rule) =>
                      rule instanceof CSSSupportsRule &&
                      rule.conditionText.includes("backdrop-filter") &&
                      rule.conditionText.startsWith("not"),
                  );
                if (!(found instanceof CSSSupportsRule))
                  throw Error("App no-blur fallback missing");
                return Array.from(found.cssRules)
                  .map((rule) => rule.cssText)
                  .join("\n");
              });
              const fallback = await page.addStyleTag({
                content: `
              ${fallbackRules}
            .app-shell .work-card,.app-shell .sidebar,.project-panel,.app-shell .modal,
            .stat-strip,.chart-section,.week-history,.mobile-nav {
              backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
            }`,
              });
              await capture(
                page,
                directory,
                name,
                "board-reduced-solid",
                records,
                false,
                true,
              );
              await fallback.evaluate((node) => node.remove());
              await page.emulateMedia({ reducedMotion: "no-preference" });

              await page
                .getByRole("button", { name: labels.manage, exact: true })
                .click();
              await page
                .getByRole("dialog")
                .getByRole("button", { name: labels.clearBoard, exact: true })
                .click();
              await page
                .getByRole("dialog")
                .getByRole("button", { name: labels.delete, exact: true })
                .click();
              await importPlan(page, labels, sparsePlan());
              await page.locator('[data-step-id="qa-sparse-thu"]').waitFor();
              await capture(page, directory, name, "board-sparse", records);
            }
          } finally {
            await context.close();
          }
        }
  } finally {
    await browser.close();
    const report = {
      baseURL: target.href,
      fixture,
      captures: records.length,
      records,
      pageErrors,
    };
    await fs.writeFile(
      path.join(directory, "measurements.json"),
      JSON.stringify(report),
    );
  }
  const overflow = records.filter(
    (record) => record.overflowPx > 1 || record.toolbarOverflowPx > 1,
  );
  assert.equal(
    records.length,
    36,
    "The screenshot coverage matrix is incomplete",
  );
  console.log(
    JSON.stringify({
      captures: records.length,
      report: path.join(directory, "measurements.json"),
      overflow: overflow.map((record) => ({
        case: record.case,
        state: record.state,
        page: record.overflowPx,
        toolbar: record.toolbarOverflowPx,
      })),
      fontFailures: records.filter(
        (record) => !record.fonts.inter || record.fonts.status !== "loaded",
      ).length,
      pageErrors: pageErrors.length,
    }),
  );
  if (
    pageErrors.length ||
    (process.env.GLASS_FAIL_ON_OVERFLOW === "1" && overflow.length)
  )
    process.exitCode = 1;
}

module.exports = { richPlan, sparsePlan, summary, checkFixture };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
