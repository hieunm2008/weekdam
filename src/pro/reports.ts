import { shiftDate, today, type Plan } from "../domain";
import { timeToMinutes, validTimeRange } from "../calendar";

export interface ReportFilter {
  from: string;
  to: string;
  /** Exact saved project name; undefined means every project. */
  projectName?: string;
}
export interface ReportMinutes {
  plannedMinutes: number;
  focusedMinutes: number;
  /** Focused minus scheduled minutes. */
  differenceMinutes: number;
}
export interface StudyReport extends ReportMinutes {
  filter: ReportFilter;
  daily: (ReportMinutes & { date: string })[];
  projects: (ReportMinutes & { projectName: string | null })[];
  entries: (ReportMinutes & { date: string; projectName: string | null })[];
  projectNames: string[];
}
export const UNATTRIBUTED_PROJECT = "__unattributed__";

export function defaultReportFilter(now = new Date()): ReportFilter {
  const to = today(now);
  return { from: shiftDate(to, -29), to };
}

const validDay = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date;
const zero = (): ReportMinutes => ({
  plannedMinutes: 0,
  focusedMinutes: 0,
  differenceMinutes: 0,
});
const compareNames = (a: string | null, b: string | null) =>
  a === null
    ? b === null
      ? 0
      : 1
    : b === null
      ? -1
      : a.localeCompare(b, "vi");
function add(target: ReportMinutes, planned: number, focused: number) {
  target.plannedMinutes += planned;
  target.focusedMinutes += focused;
  target.differenceMinutes = target.focusedMinutes - target.plannedMinutes;
}

export function buildStudyReport(
  plan: Plan,
  filter: ReportFilter = defaultReportFilter(),
): StudyReport {
  if (
    !validDay(filter.from) ||
    !validDay(filter.to) ||
    filter.from > filter.to ||
    Date.parse(filter.to) - Date.parse(filter.from) > 3660 * 86400000
  )
    throw new Error("invalid-report-range");
  const daily = new Map<string, StudyReport["daily"][number]>();
  const entries = new Map<string, StudyReport["entries"][number]>();
  const names = new Set<string>();
  for (let date = filter.from; date <= filter.to; date = shiftDate(date, 1))
    daily.set(date, { date, ...zero() });
  const collect = (
    date: string,
    name: string | null,
    planned: number,
    focused: number,
  ) => {
    if (name !== null) names.add(name);
    if (
      date < filter.from ||
      date > filter.to ||
      (filter.projectName !== undefined &&
        (filter.projectName === UNATTRIBUTED_PROJECT
          ? name !== null
          : name !== filter.projectName))
    )
      return;
    const key = JSON.stringify([date, name]);
    let entry = entries.get(key);
    if (!entry) {
      entry = { date, projectName: name, ...zero() };
      entries.set(key, entry);
    }
    add(entry, planned, focused);
    add(daily.get(date)!, planned, focused);
  };
  for (const week of plan.weeks)
    for (const project of week.projects) {
      names.add(project.name);
      for (const task of project.tasks)
        for (const step of task.subtasks)
          if (validTimeRange(step.startTime!, step.endTime!))
            collect(
              shiftDate(week.start, step.day),
              project.name,
              timeToMinutes(step.endTime!) - timeToMinutes(step.startTime!),
              0,
            );
    }
  // Stored sessions contain focus only; completed and stopped sessions both count.
  for (const session of plan.pomodoroSessions ?? [])
    if (
      Number.isFinite(session.endedAt) &&
      session.focusedDurationMs >= 0 &&
      (session.outcome === "completed" || session.outcome === "stopped")
    )
      collect(
        today(new Date(session.endedAt)),
        session.task?.projectName ?? null,
        0,
        session.focusedDurationMs / 60000,
      );
  const projects = new Map<string | null, StudyReport["projects"][number]>();
  const totals = zero();
  const sortedEntries = [...entries.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      compareNames(a.projectName, b.projectName),
  );
  for (const entry of sortedEntries) {
    let project = projects.get(entry.projectName);
    if (!project) {
      project = { projectName: entry.projectName, ...zero() };
      projects.set(entry.projectName, project);
    }
    add(project, entry.plannedMinutes, entry.focusedMinutes);
    add(totals, entry.plannedMinutes, entry.focusedMinutes);
  }
  return {
    filter: { ...filter },
    ...totals,
    daily: [...daily.values()],
    entries: sortedEntries,
    projects: [...projects.values()].sort((a, b) =>
      compareNames(a.projectName, b.projectName),
    ),
    projectNames: [...names].sort((a, b) => a.localeCompare(b, "vi")),
  };
}

const copy = {
  vi: {
    title: "Báo cáo học tập Pro",
    date: "Ngày",
    project: "Môn / project",
    planned: "Phút đã lên lịch",
    focused: "Phút tập trung",
    difference: "Chênh lệch",
    unassigned: "Không gắn công việc",
    total: "Tổng",
    explanation: "Chênh lệch = phút tập trung − phút đã lên lịch",
  },
  en: {
    title: "Pro study report",
    date: "Date",
    project: "Subject / project",
    planned: "Scheduled minutes",
    focused: "Focused minutes",
    difference: "Difference",
    unassigned: "Unassigned",
    total: "Total",
    explanation: "Difference = focused minutes − scheduled minutes",
  },
};
function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe =
    /^[\s\u0000-\u001f]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value)
      ? "'" + value
      : value;
  return /[",\r\n]/.test(safe) ? '"' + safe.replaceAll('"', '""') + '"' : safe;
}
export function exportStudyReportCsv(
  report: StudyReport,
  language: "vi" | "en" = "vi",
): string {
  const c = copy[language];
  const rows: (string | number)[][] = [
    [c.date, c.project, c.planned, c.focused, c.difference],
  ];
  for (const day of report.daily) {
    const entries = report.entries.filter((entry) => entry.date === day.date);
    if (!entries.length) rows.push([day.date, "", 0, 0, 0]);
    for (const entry of entries)
      rows.push([
        entry.date,
        entry.projectName ?? c.unassigned,
        entry.plannedMinutes,
        entry.focusedMinutes,
        entry.differenceMinutes,
      ]);
  }
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
export function studyReportPrintHtml(
  report: StudyReport,
  language: "vi" | "en" = "vi",
): string {
  const c = copy[language];
  const row = (cells: (string | number)[], header = false) =>
    "<tr>" +
    cells
      .map(
        (cell) =>
          `<${header ? "th" : "td"}>${escapeHtml(String(cell))}</${header ? "th" : "td"}>`,
      )
      .join("") +
    "</tr>";
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>${c.title}</title><style>body{font:14px system-ui,sans-serif;color:#111;margin:32px}table{width:100%;border-collapse:collapse;margin-block:20px}td,th{border:1px solid #ccc;padding:8px;text-align:left}h1{font-size:24px}@media print{body{margin:0}tr{break-inside:avoid}}</style></head><body><h1>${c.title}</h1><p>${report.filter.from} – ${report.filter.to}</p><p>${c.explanation}</p><table>${row([c.total, c.planned, c.focused, c.difference], true)}${row(["", report.plannedMinutes, report.focusedMinutes, report.differenceMinutes])}</table><table>${row([c.date, c.planned, c.focused, c.difference], true)}${report.daily.map((day) => row([day.date, day.plannedMinutes, day.focusedMinutes, day.differenceMinutes])).join("")}</table><table>${row([c.project, c.planned, c.focused, c.difference], true)}${report.projects.map((project) => row([project.projectName ?? c.unassigned, project.plannedMinutes, project.focusedMinutes, project.differenceMinutes])).join("")}</table></body></html>`;
}
