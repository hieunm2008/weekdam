import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { today, weekStart, type Plan } from "../domain";
import {
  buildStudyReport,
  defaultReportFilter,
  exportStudyReportCsv,
  studyReportPrintHtml,
  UNATTRIBUTED_PROJECT,
  type ReportFilter,
} from "./reports";

function samplePlan(english: boolean): Plan {
  const date = today();
  const start = weekStart(date);
  const day = Math.round((Date.parse(date) - Date.parse(start)) / 86400000);
  return {
    version: 1,
    weeks: [
      {
        id: "sample-week",
        start,
        ended: false,
        projects: [
          {
            id: "sample-project",
            name: english ? "Final exam" : "Ôn thi cuối kỳ",
            tasks: [
              {
                id: "sample-task",
                name: english ? "Revision" : "Ôn tập",
                note: "",
                done: false,
                subtasks: [
                  {
                    id: "sample-session",
                    day,
                    weight: 1,
                    note: "",
                    done: false,
                    missed: [],
                    startTime: "08:00",
                    endTime: "08:50",
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
        id: "sample-focus",
        startedAt: Date.now() - 2100000,
        endedAt: Date.now(),
        plannedDurationMs: 3000000,
        focusedDurationMs: 2100000,
        outcome: "stopped",
        task: {
          id: "sample-task",
          name: english ? "Revision" : "Ôn tập",
          projectName: english ? "Final exam" : "Ôn thi cuối kỳ",
        },
      },
    ],
  };
}

export function ReportsTool({
  plan,
  allowed,
  canUsePro,
  onRequire,
}: {
  plan: Plan;
  allowed: boolean;
  canUsePro?: () => boolean;
  onRequire: () => void;
}) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const language = en ? "en" : "vi";
  const [draft, setDraft] = useState<ReportFilter>(defaultReportFilter);
  const [filter, setFilter] = useState<ReportFilter>(defaultReportFilter);
  const [error, setError] = useState("");
  const example = useMemo(() => samplePlan(en), [en]);
  const source = allowed ? plan : example;
  const report = useMemo(
    () => buildStudyReport(source, filter),
    [source, filter],
  );
  const names = useMemo(
    () => buildStudyReport(source, defaultReportFilter()).projectNames,
    [source],
  );
  const number = (value: number) =>
    new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value);
  const c = en
    ? {
        heading: "Pro study reports",
        intro:
          "Compare scheduled study time with recorded Pomodoro focus time. Stopped sessions count; breaks do not.",
        sampleLabel: "Sample data",
        sample: "Upgrade to generate and export your own reports.",
        from: "From date",
        to: "To date",
        project: "Subject / project",
        all: "All projects",
        unassigned: "Unassigned focus",
        generate: "Generate report",
        planned: "Scheduled minutes",
        focused: "Focused minutes",
        difference: "Difference",
        explanation:
          "Difference = focused − scheduled. Untimed tasks do not count as scheduled minutes. Sessions use their saved project name and Vietnam end date.",
        csv: "Export CSV",
        print: "Print / Save as PDF",
        invalid: "Choose a valid date range (up to 10 years).",
        popup: "Allow the print window, then try again.",
        daily: "Daily study time",
        date: "Date",
        projects: "By subject / project",
        empty: "No study time was recorded for these filters.",
      }
    : {
        heading: "Báo cáo học tập Pro",
        intro:
          "Đối chiếu thời gian đã lên lịch với thời gian tập trung ghi bằng Pomodoro. Tính cả phiên dừng sớm, loại thời gian nghỉ.",
        sampleLabel: "Dữ liệu mẫu",
        sample: "Nâng cấp để tạo và xuất báo cáo của bạn.",
        from: "Từ ngày",
        to: "Đến ngày",
        project: "Môn / project",
        all: "Tất cả project",
        unassigned: "Không gắn công việc",
        generate: "Tạo báo cáo",
        planned: "Phút đã lên lịch",
        focused: "Phút tập trung",
        difference: "Chênh lệch",
        explanation:
          "Chênh lệch = tập trung − đã lên lịch. Việc chưa đặt giờ không quy đổi thành phút. Phiên dùng tên project đã lưu và ngày kết thúc theo giờ Việt Nam.",
        csv: "Xuất CSV",
        print: "In / Lưu PDF",
        invalid: "Chọn khoảng ngày hợp lệ (tối đa 10 năm).",
        popup: "Cho phép mở cửa sổ in rồi thử lại.",
        daily: "Thời gian học theo ngày",
        date: "Ngày",
        projects: "Theo môn / project",
        empty: "Không có thời gian học trong bộ lọc này.",
      };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || !(canUsePro?.() ?? true)) {
      onRequire();
      return;
    }
    try {
      buildStudyReport(plan, draft);
      setFilter({ ...draft });
      setError("");
    } catch {
      setError(c.invalid);
    }
  };
  const download = () => {
    if (!allowed || !(canUsePro?.() ?? true)) {
      onRequire();
      return;
    }
    const url = URL.createObjectURL(
      new Blob([exportStudyReportCsv(report, language)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `weekdam-${filter.from}-${filter.to}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const print = () => {
    if (!allowed || !(canUsePro?.() ?? true)) {
      onRequire();
      return;
    }
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      setError(c.popup);
      return;
    }
    popup.opener = null;
    popup.document.write(studyReportPrintHtml(report, language));
    popup.document.close();
    popup.focus();
    popup.print();
  };
  const maxMinutes = Math.max(
    1,
    ...report.daily.flatMap((day) => [day.plannedMinutes, day.focusedMinutes]),
  );
  return (
    <section className="pro-panel" aria-labelledby="pro-reports-title">
      <h2 id="pro-reports-title">{c.heading}</h2>
      <p>{c.intro}</p>
      {!allowed && (
        <p className="pro-hint">
          <span className="pro-tag">{c.sampleLabel}</span> {c.sample}
        </p>
      )}
      <form onSubmit={submit}>
        <div className="pro-fields">
          <label>
            {c.from}
            <input
              type="date"
              value={draft.from}
              required
              onChange={(event) =>
                setDraft({ ...draft, from: event.target.value })
              }
            />
          </label>
          <label>
            {c.to}
            <input
              type="date"
              value={draft.to}
              required
              onChange={(event) =>
                setDraft({ ...draft, to: event.target.value })
              }
            />
          </label>
          <label className="full">
            {c.project}
            <select
              value={draft.projectName ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  projectName: event.target.value || undefined,
                })
              }
            >
              <option value="">{c.all}</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={UNATTRIBUTED_PROJECT}>{c.unassigned}</option>
            </select>
          </label>
        </div>
        <button className="primary" type="submit">
          {c.generate}
        </button>
      </form>
      {error && (
        <p role="alert" className="pro-error">
          {error}
        </p>
      )}
      <p className="pro-hint">
        {filter.from} – {filter.to}
        {filter.projectName
          ? ` · ${filter.projectName === UNATTRIBUTED_PROJECT ? c.unassigned : filter.projectName}`
          : ""}
      </p>
      <div className="pro-metrics">
        <div>
          <strong>{number(report.plannedMinutes)}</strong>
          <span>{c.planned}</span>
        </div>
        <div>
          <strong>{number(report.focusedMinutes)}</strong>
          <span>{c.focused}</span>
        </div>
        <div>
          <strong>{number(report.differenceMinutes)}</strong>
          <span>{c.difference}</span>
        </div>
      </div>
      <p className="pro-hint">{c.explanation}</p>
      {!report.entries.length && <p>{c.empty}</p>}
      <div className="pro-chart">
        <svg viewBox="0 0 720 195" role="img" aria-label={c.daily}>
          <title>{c.daily}</title>
          <line
            x1="20"
            y1="155"
            x2="710"
            y2="155"
            stroke="currentColor"
            opacity="0.3"
          />
          {report.daily.map((day, index) => {
            const width = 680 / report.daily.length;
            const x = 25 + index * width;
            return (
              <g key={day.date}>
                <title>{`${day.date}: ${c.planned} ${number(day.plannedMinutes)}, ${c.focused} ${number(day.focusedMinutes)}`}</title>
                <rect
                  x={x}
                  y={155 - (130 * day.plannedMinutes) / maxMinutes}
                  width={Math.max(1, width * 0.35)}
                  height={(130 * day.plannedMinutes) / maxMinutes}
                  fill="var(--muted)"
                  opacity="0.45"
                />
                <rect
                  x={x + width * 0.4}
                  y={155 - (130 * day.focusedMinutes) / maxMinutes}
                  width={Math.max(1, width * 0.35)}
                  height={(130 * day.focusedMinutes) / maxMinutes}
                  fill="var(--accent)"
                />
                {(index === 0 ||
                  index === report.daily.length - 1 ||
                  report.daily.length < 8) && (
                  <text
                    x={x}
                    y="180"
                    fontSize="11"
                    fill="currentColor"
                    textAnchor={
                      index === report.daily.length - 1 ? "end" : "start"
                    }
                  >
                    {day.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="pro-hint">
          ◼ {c.planned} · <span style={{ color: "var(--accent)" }}>◼</span>{" "}
          {c.focused}
        </p>
      </div>
      <div className="pro-table-wrap">
        <table className="pro-table">
          <caption>{c.projects}</caption>
          <thead>
            <tr>
              <th scope="col">{c.project}</th>
              <th scope="col">{c.planned}</th>
              <th scope="col">{c.focused}</th>
              <th scope="col">{c.difference}</th>
            </tr>
          </thead>
          <tbody>
            {report.projects.map((project) => (
              <tr key={project.projectName ?? UNATTRIBUTED_PROJECT}>
                <th
                  scope="row"
                  style={{ overflowWrap: "anywhere", maxWidth: 280 }}
                >
                  {project.projectName ?? c.unassigned}
                </th>
                <td>{number(project.plannedMinutes)}</td>
                <td>{number(project.focusedMinutes)}</td>
                <td>{number(project.differenceMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>{c.daily}</summary>
        <div className="pro-table-wrap">
          <table className="pro-table">
            <thead>
              <tr>
                <th scope="col">{c.date}</th>
                <th scope="col">{c.planned}</th>
                <th scope="col">{c.focused}</th>
                <th scope="col">{c.difference}</th>
              </tr>
            </thead>
            <tbody>
              {report.daily.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{day.date}</th>
                  <td>{number(day.plannedMinutes)}</td>
                  <td>{number(day.focusedMinutes)}</td>
                  <td>{number(day.differenceMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="pro-actions">
        <button type="button" className="secondary" onClick={download}>
          {c.csv}
        </button>
        <button type="button" className="secondary" onClick={print}>
          {c.print}
        </button>
      </div>
    </section>
  );
}
export default ReportsTool;
