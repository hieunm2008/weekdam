import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { createInstance } from "i18next";
import { ReportsTool } from "./ReportsTool";
import { RemindersTool } from "./RemindersTool";
import type { Plan } from "../domain";
const plan: Plan = {
  version: 1,
  weeks: [
    {
      id: "w",
      start: "2026-10-19",
      ended: false,
      projects: [{ id: "p", name: "PRIVATE_PROJECT", tasks: [] }],
    },
  ],
};
const i18n = createInstance();
void i18n
  .use(initReactI18next)
  .init({ lng: "vi", resources: { vi: { translation: {} } } });
function render(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(I18nextProvider, { i18n }, element),
  );
}
describe("report and reminder tools", () => {
  it("shows sample report data to guests without exposing the supplied plan", () => {
    const html = render(
      createElement(ReportsTool, { plan, allowed: false, onRequire: () => {} }),
    );
    expect(html).not.toContain("PRIVATE_PROJECT");
    expect(html).toContain("CSV");
    expect(html).toContain("PDF");
    expect(html).toContain('type="date"');
  });
  it("shows the saved project filter to entitled users", () => {
    expect(
      render(
        createElement(ReportsTool, {
          plan,
          allowed: true,
          onRequire: () => {},
        }),
      ),
    ).toContain("PRIVATE_PROJECT");
  });
  it("provides the three default deadline milestones and explicit browser permission control", () => {
    const html = render(
      createElement(RemindersTool, {
        plan,
        allowed: true,
        onChange: () => {},
        onRequire: () => {},
      }),
    );
    expect(html.match(/checked=""/g)).toHaveLength(3);
    expect(html).toContain("4320");
    expect(html).toContain("1440");
    expect(html).toContain("120");
    expect(html).toContain('type="button"');
  });
});
