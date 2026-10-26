import { describe, expect, it } from "vitest";
import type { Plan } from "../domain";
import {
  buildStudyReport,
  defaultReportFilter,
  exportStudyReportCsv,
  studyReportPrintHtml,
} from "./reports";

const plan: Plan = {
  version: 1,
  weeks: [
    {
      id: "w",
      start: "2026-10-19",
      ended: false,
      projects: [
        {
          id: "p",
          name: "Toán",
          tasks: [
            {
              id: "t",
              name: "Đại số",
              note: "",
              done: false,
              subtasks: [
                {
                  id: "s",
                  day: 4,
                  weight: 1,
                  note: "",
                  done: true,
                  missed: [],
                  startTime: "08:00",
                  endTime: "08:50",
                },
                {
                  id: "untimed",
                  day: 4,
                  weight: 3,
                  note: "",
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
  pomodoroSessions: [
    {
      id: "complete",
      startedAt: Date.parse("2026-10-22T23:40:00+07:00"),
      endedAt: Date.parse("2026-10-23T00:05:00+07:00"),
      plannedDurationMs: 1500000,
      focusedDurationMs: 1500000,
      outcome: "completed",
      task: { id: "deleted", name: "Đã xóa", projectName: "Tên cũ" },
    },
    {
      id: "early",
      startedAt: Date.parse("2026-10-23T08:00:00+07:00"),
      endedAt: Date.parse("2026-10-23T08:10:00+07:00"),
      plannedDurationMs: 1500000,
      focusedDurationMs: 600000,
      outcome: "stopped",
      task: { id: "t", name: "Đại số", projectName: "Toán" },
    },
    {
      id: "none",
      startedAt: Date.parse("2026-10-23T09:00:00+07:00"),
      endedAt: Date.parse("2026-10-23T09:05:00+07:00"),
      plannedDurationMs: 1500000,
      focusedDurationMs: 300000,
      outcome: "stopped",
    },
  ],
};

describe("Pro study reports", () => {
  it("defaults to the last 30 calendar days in Vietnam", () => {
    expect(defaultReportFilter(new Date("2027-01-01T00:00:00+07:00"))).toEqual({
      from: "2026-12-03",
      to: "2027-01-01",
    });
  });
  it("counts only timed sessions and includes stopped focus on the Vietnam end day", () => {
    const report = buildStudyReport(plan, {
      from: "2026-10-22",
      to: "2026-10-23",
    });
    expect(report.plannedMinutes).toBe(50);
    expect(report.focusedMinutes).toBe(40);
    expect(report.differenceMinutes).toBe(-10);
    expect(report.daily).toEqual([
      {
        date: "2026-10-22",
        plannedMinutes: 0,
        focusedMinutes: 0,
        differenceMinutes: 0,
      },
      {
        date: "2026-10-23",
        plannedMinutes: 50,
        focusedMinutes: 40,
        differenceMinutes: -10,
      },
    ]);
  });
  it("filters by snapshot project names even after deletion and groups unattributed focus separately", () => {
    const all = buildStudyReport(plan, {
      from: "2026-10-23",
      to: "2026-10-23",
    });
    expect(all.projects).toEqual([
      {
        projectName: "Tên cũ",
        plannedMinutes: 0,
        focusedMinutes: 25,
        differenceMinutes: 25,
      },
      {
        projectName: "Toán",
        plannedMinutes: 50,
        focusedMinutes: 10,
        differenceMinutes: -40,
      },
      {
        projectName: null,
        plannedMinutes: 0,
        focusedMinutes: 5,
        differenceMinutes: 5,
      },
    ]);
    const report = buildStudyReport(plan, {
      from: "2026-10-23",
      to: "2026-10-23",
      projectName: "Tên cũ",
    });
    expect(report.plannedMinutes).toBe(0);
    expect(report.focusedMinutes).toBe(25);
    expect(report.entries).toHaveLength(1);
  });
  it("returns zero-valued days for empty ranges and rejects reversed or invalid dates", () => {
    expect(
      buildStudyReport(
        { version: 1, weeks: [] },
        { from: "2026-12-31", to: "2027-01-01" },
      ).daily,
    ).toHaveLength(2);
    expect(() =>
      buildStudyReport(plan, { from: "2026-02-30", to: "2026-03-01" }),
    ).toThrow("invalid-report-range");
    expect(() =>
      buildStudyReport(plan, { from: "2026-10-24", to: "2026-10-23" }),
    ).toThrow("invalid-report-range");
  });
  it("exports only filtered rows with a UTF8 BOM, Vietnamese, CSV quoting and safe formula cells", () => {
    const dangerous = structuredClone(plan);
    dangerous.weeks[0].projects[0].name = '  =SUM(1,2)"';
    const report = buildStudyReport(dangerous, {
      from: "2026-10-23",
      to: "2026-10-23",
      projectName: '  =SUM(1,2)"',
    });
    const csv = exportStudyReportCsv(report, "vi");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      "Ngày,Môn / project,Phút đã lên lịch,Phút tập trung,Chênh lệch",
    );
    expect(csv).toContain('2026-10-23,"\'  =SUM(1,2)""",50,0,-50');
    expect(csv).not.toContain("Tên cũ");
  });
  it("escapes user content in printable HTML and contains the filtered data", () => {
    const copy = structuredClone(plan);
    copy.weeks[0].projects[0].name = '<img src=x onerror="alert(1)">';
    const report = buildStudyReport(copy, {
      from: "2026-10-23",
      to: "2026-10-23",
      projectName: copy.weeks[0].projects[0].name,
    });
    const html = studyReportPrintHtml(report, "vi");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).toContain("2026-10-23");
    expect(html).not.toContain("Tên cũ");
  });
  it("exports every empty day visible in a report instead of a header-only CSV", () => {
    const report = buildStudyReport(
      { version: 1, weeks: [] },
      { from: "2026-12-31", to: "2027-01-01" },
    );
    expect(exportStudyReportCsv(report, "en")).toBe(
      "\uFEFFDate,Subject / project,Scheduled minutes,Focused minutes,Difference\r\n2026-12-31,,0,0,0\r\n2027-01-01,,0,0,0\r\n",
    );
  });
  it.each([
    "+SUM(1)",
    "-1+1",
    "@SUM(1)",
    "\t=1+1",
    "\r=1+1",
    "\n=1+1",
    " \u0001=1+1",
  ])("escapes formula-leading project name %j in the exported CSV", (name) => {
    const copy = structuredClone(plan);
    copy.weeks[0].projects[0].name = name;
    const report = buildStudyReport(copy, {
      from: "2026-10-23",
      to: "2026-10-23",
      projectName: name,
    });
    expect(exportStudyReportCsv(report, "en")).toContain("'" + name);
  });
});
