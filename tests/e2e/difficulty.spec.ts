import { test, expect, type Locator, type Page } from "@playwright/test";
import { glassPlan, loadGlass } from "../fixtures/glass";

const levels = [
  { weight: 1, label: "Nhẹ", id: "difficulty-light", hue: [80, 170] },
  { weight: 2, label: "Vừa", id: "difficulty-medium", hue: [35, 70] },
  { weight: 3, label: "Nặng", id: "difficulty-heavy", hue: [345, 25] },
] as const;
type Level = (typeof levels)[number];
type Theme = "light" | "dark";
type RGB = [number, number, number];

function difficultyPlan() {
  const sample = glassPlan();
  const project = sample.weeks[0].projects[0];
  project.tasks = levels.map((level, index) => ({
    id: `task-${level.id}`,
    name: `Công việc ${level.label.toLowerCase()}`,
    note: "",
    done: false,
    subtasks: [
      {
        id: level.id,
        day: 3,
        dayOrder: (index + 1) * 1024,
        weight: level.weight,
        note: "",
        done: false,
        missed: [],
      },
    ],
  }));
  sample.weeks[0].projects = [project];
  return sample;
}

async function setTheme(page: Page, theme: Theme) {
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByLabel("Giao diện", { exact: true }).selectOption(theme);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

function badge(container: Locator, level: Level) {
  return container.getByRole("img", {
    name: `Độ khó: ${level.label}`,
    exact: true,
  });
}

function rgb(css: string): { channels: RGB; alpha: number } {
  const values = css.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) throw Error(`Unexpected color: ${css}`);
  return { channels: values.slice(0, 3) as RGB, alpha: values[3] ?? 1 };
}

function hsl(channels: RGB) {
  const [red, green, blue] = channels.map((channel) => channel / 255);
  const max = Math.max(red, green, blue),
    min = Math.min(red, green, blue),
    delta = max - min,
    lightness = (max + min) / 2;
  const hue =
    delta === 0
      ? 0
      : max === red
        ? 60 * (((green - blue) / delta + 6) % 6)
        : max === green
          ? 60 * ((blue - red) / delta + 2)
          : 60 * ((red - green) / delta + 4);
  return {
    hue,
    saturation: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
    lightness,
  };
}

function luminance(channels: RGB) {
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

async function expectDifficultyColors(
  target: Locator,
  level: Level,
  theme: Theme,
) {
  const styles = await target.evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, text: style.color };
  });
  const fill = rgb(styles.background),
    text = rgb(styles.text),
    color = hsl(fill.channels);
  expect(fill.alpha, "Difficulty fill must stay opaque over glass").toBe(1);
  expect(text.alpha).toBe(1);
  expect(
    color.saturation,
    "Difficulty colors must remain distinct",
  ).toBeGreaterThan(0.1);
  const [start, end] = level.hue;
  expect(
    start <= end
      ? color.hue >= start && color.hue <= end
      : color.hue >= start || color.hue <= end,
    `${level.label} should use its green/yellow/red color family: ${styles.background}`,
  ).toBe(true);
  if (theme === "light") {
    expect(
      color.lightness,
      "Light-theme colors should be soft pastels",
    ).toBeGreaterThanOrEqual(0.8);
  } else {
    expect(
      color.lightness,
      "Dark-theme fills should remain subdued",
    ).toBeLessThanOrEqual(0.4);
  }
  const fillLuminance = luminance(fill.channels),
    textLuminance = luminance(text.channels);
  expect(
    (Math.max(fillLuminance, textLuminance) + 0.05) /
      (Math.min(fillLuminance, textLuminance) + 0.05),
    `Difficulty text must remain readable: ${styles.text} on ${styles.background}`,
  ).toBeGreaterThanOrEqual(4.5);
  return styles;
}

for (const theme of ["light", "dark"] as const) {
  test(`shows readable ${theme} difficulty colors on cards and drag previews`, async ({
    page,
  }) => {
    await loadGlass(page, false, difficultyPlan());
    await setTheme(page, theme);
    for (const level of levels) {
      const card = page.locator(`[data-step-id="${level.id}"]`);
      const marker = badge(card, level);
      await expect(marker).toBeVisible();
      await expect(marker).toHaveText(level.label);
      const cardColors = await expectDifficultyColors(marker, level, theme);
      await card.locator(".drag-handle").focus();
      await page.keyboard.press("Space");
      const preview = badge(
        page.locator(`.drag-preview[data-overlay-id="${level.id}"]`),
        level,
      );
      await expect(preview).toBeVisible();
      await expect(preview).toHaveText(level.label);
      expect(await expectDifficultyColors(preview, level, theme)).toEqual(
        cardColors,
      );
      await page.keyboard.press("Escape");
    }
  });
}

test("updates difficulty colors while editing, saves, undoes and persists them", async ({
  page,
}) => {
  await loadGlass(page, false, difficultyPlan());
  const card = page.locator('[data-step-id="difficulty-light"]');
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await card.locator(".task-title").click();
    const editor = page.getByRole("dialog", {
      name: "Sửa công việc",
      exact: true,
    });
    const difficulty = editor.getByRole("combobox", {
      name: "Độ khó",
      exact: true,
    });
    for (const level of levels) {
      await expect(badge(editor, level)).toBeVisible();
      await expect(badge(editor, level)).toHaveText(level.label);
      await expectDifficultyColors(badge(editor, level), level, theme);
      await difficulty.selectOption(String(level.weight));
      await expect(difficulty).toHaveValue(String(level.weight));
      await expectDifficultyColors(difficulty, level, theme);
    }
    await editor.getByRole("button", { name: "Hủy", exact: true }).click();
  }

  await card.locator(".task-title").click();
  await page
    .getByRole("combobox", { name: "Độ khó", exact: true })
    .selectOption("3");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(badge(card, levels[2])).toHaveText("Nặng");
  await expectDifficultyColors(badge(card, levels[2]), levels[2], "dark");
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(badge(card, levels[0])).toHaveText("Nhẹ");
  await expectDifficultyColors(badge(card, levels[0]), levels[0], "dark");

  await card.locator(".task-title").click();
  await page
    .getByRole("combobox", { name: "Độ khó", exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(badge(card, levels[1])).toHaveText("Vừa");
  await expectDifficultyColors(badge(card, levels[1]), levels[1], "dark");
  await page.reload();
  await expect(badge(card, levels[1])).toHaveText("Vừa");
  await expectDifficultyColors(badge(card, levels[1]), levels[1], "dark");
});
