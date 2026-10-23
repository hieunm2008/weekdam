import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
} from "lucide-react";
import { shiftDate, today, type Project } from "../domain";
import {
  validPomodoroSettings,
  type PomodoroAction,
  type PomodoroRuntime,
  type PomodoroSession,
  type PomodoroSettings,
} from "../pomodoro";
import {
  formatPomodoroTime,
  nextPomodoroLabel,
  PomodoroCountdown,
} from "./PomodoroMiniBar";
import "../pomodoro.css";

export interface PomodoroPageProps {
  runtime: PomodoroRuntime | null;
  projects: Project[];
  sessions: PomodoroSession[];
  onAction: (action: PomodoroAction) => void;
  onEnableNotifications: () => void;
  onRetry?: () => void;
  error?: string;
  notice?: string;
}

const durationFields = [
  { key: "focusMinutes", label: "pomodoroFocusMinutes", min: 1, max: 120 },
  {
    key: "shortBreakMinutes",
    label: "pomodoroShortBreakMinutes",
    min: 1,
    max: 30,
  },
  {
    key: "longBreakMinutes",
    label: "pomodoroLongBreakMinutes",
    min: 1,
    max: 60,
  },
  { key: "longBreakEvery", label: "pomodoroLongBreakEvery", min: 2, max: 12 },
] as const;

function PomodoroSettingsForm({
  runtime,
  onAction,
  onEnableNotifications,
}: Pick<PomodoroPageProps, "onAction" | "onEnableNotifications"> & {
  runtime: PomodoroRuntime;
}) {
  const { t } = useTranslation();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const settings: PomodoroSettings = {
      ...runtime.settings,
      focusMinutes: Number(values.get("focusMinutes")),
      shortBreakMinutes: Number(values.get("shortBreakMinutes")),
      longBreakMinutes: Number(values.get("longBreakMinutes")),
      longBreakEvery: Number(values.get("longBreakEvery")),
    };
    if (validPomodoroSettings(settings))
      onAction({ type: "settings", settings });
  };
  return (
    <aside
      className="pomodoro-settings"
      aria-labelledby="pomodoro-settings-heading"
    >
      <h2 id="pomodoro-settings-heading">
        <Settings2 size={18} aria-hidden="true" />
        {t("pomodoroSettings")}
      </h2>
      <form onSubmit={submit}>
        <div className="pomodoro-settings-grid">
          {durationFields.map(({ key, label, min, max }) => (
            <label key={key}>
              {t(label)}
              <input
                type="number"
                name={key}
                min={min}
                max={max}
                step="1"
                required
                defaultValue={runtime.settings[key]}
              />
            </label>
          ))}
        </div>
        <button className="secondary pomodoro-save-settings">
          {t("pomodoroSaveSettings")}
        </button>
        <p className="pomodoro-settings-hint">{t("pomodoroSettingsHint")}</p>
      </form>
      <div className="pomodoro-alert-settings">
        <label className="check-label">
          <input
            type="checkbox"
            checked={runtime.settings.sound}
            onChange={(event) =>
              onAction({
                type: "settings",
                settings: { ...runtime.settings, sound: event.target.checked },
              })
            }
          />
          <Volume2 size={17} aria-hidden="true" />
          <span>{t("pomodoroSound")}</span>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={runtime.settings.notifications}
            onChange={(event) => {
              if (event.target.checked) onEnableNotifications();
              else
                onAction({
                  type: "settings",
                  settings: { ...runtime.settings, notifications: false },
                });
            }}
          />
          <Bell size={17} aria-hidden="true" />
          <span>{t("pomodoroNotifications")}</span>
        </label>
      </div>
    </aside>
  );
}

function PomodoroHistory({ sessions }: { sessions: PomodoroSession[] }) {
  const { t, i18n } = useTranslation();
  const [shown, setShown] = useState(20);
  const ordered = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => b.endedAt - a.endedAt || b.id.localeCompare(a.id),
      ),
    [sessions],
  );
  const currentDay = today();
  const lastSevenDays = shiftDate(currentDay, -6);
  let todayDuration = 0;
  let weekDuration = 0;
  let completedToday = 0;
  let completedWeek = 0;
  for (const session of sessions) {
    const day = today(new Date(session.endedAt));
    if (day === currentDay) {
      todayDuration += session.focusedDurationMs;
      if (session.outcome === "completed") completedToday++;
    }
    if (day >= lastSevenDays && day <= currentDay) {
      weekDuration += session.focusedDurationMs;
      if (session.outcome === "completed") completedWeek++;
    }
  }
  const locale = i18n.language.startsWith("en") ? "en-GB" : "vi-VN";
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const dates = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    <section
      className="pomodoro-history-section"
      aria-labelledby="pomodoro-history-heading"
    >
      <div className="pomodoro-summary">
        <div>
          <span>{t("pomodoroTodayFocus")}</span>
          <strong>
            {numbers.format(todayDuration / 60_000)}
            <small>{t("pomodoroMinutes")}</small>
          </strong>
        </div>
        <div>
          <span>{t("pomodoroTodayCompleted")}</span>
          <strong>
            {completedToday}
            <small>{t("pomodoroSessionsUnit")}</small>
          </strong>
        </div>
        <div>
          <span>{t("pomodoroSevenDays")}</span>
          <strong>
            {numbers.format(weekDuration / 60_000)}
            <small>{t("pomodoroMinutes")}</small>
          </strong>
        </div>
        <div>
          <span>{t("pomodoroSevenDaysCompleted")}</span>
          <strong>
            {completedWeek}
            <small>{t("pomodoroSessionsUnit")}</small>
          </strong>
        </div>
      </div>
      <div className="pomodoro-history-heading">
        <h2 id="pomodoro-history-heading">{t("pomodoroHistory")}</h2>
        <span>{t("pomodoroHistoryCount", { count: sessions.length })}</span>
      </div>
      <ul className="pomodoro-history" data-testid="pomodoro-history">
        {ordered.slice(0, shown).map((session) => (
          <li
            className="pomodoro-history-item"
            key={session.id}
            data-session-id={session.id}
          >
            <div className="pomodoro-history-task">
              <strong title={session.task?.name}>
                {session.task?.name || t("pomodoroFree")}
              </strong>
              <span>
                {session.task?.projectName
                  ? `${session.task.projectName} · `
                  : ""}
                {dates.format(new Date(session.endedAt))}
              </span>
            </div>
            <div className="pomodoro-history-duration">
              <strong>{formatPomodoroTime(session.focusedDurationMs)}</strong>
              <span className={`pomodoro-outcome is-${session.outcome}`}>
                {t(`pomodoroOutcome_${session.outcome}`)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!sessions.length ? (
        <p className="pomodoro-empty-history">{t("pomodoroEmptyHistory")}</p>
      ) : null}
      {shown < ordered.length ? (
        <button
          className="text-button pomodoro-show-more"
          onClick={() => setShown((value) => value + 20)}
        >
          {t("pomodoroShowMore")}
        </button>
      ) : null}
    </section>
  );
}

export default function PomodoroPage({
  runtime,
  projects,
  sessions,
  onAction,
  onEnableNotifications,
  onRetry,
  error,
  notice,
}: PomodoroPageProps) {
  const { t } = useTranslation();
  if (!runtime)
    return (
      <div className="pomodoro-page" data-testid="pomodoro-page">
        {error ? (
          <>
            <p className="pomodoro-message is-error" role="alert">
              {error}
            </p>
            {onRetry ? (
              <button className="secondary" onClick={onRetry}>
                {t("pomodoroRetry")}
              </button>
            ) : null}
          </>
        ) : (
          <p role="status">{t("loading")}</p>
        )}
      </div>
    );
  const active = runtime.status === "running" || runtime.status === "paused";
  const selectedExists = projects.some((project) =>
    project.tasks.some((task) => task.id === runtime.task?.id),
  );
  const action =
    runtime.status === "running"
      ? "pause"
      : runtime.status === "paused"
        ? "resume"
        : runtime.status === "finished"
          ? "next"
          : "start";
  const primaryLabel =
    action === "next"
      ? nextPomodoroLabel(runtime)
      : `pomodoro${action[0].toUpperCase()}${action.slice(1)}`;
  const settingsKey = durationFields
    .map(({ key }) => runtime.settings[key])
    .join("-");
  return (
    <div
      className={`pomodoro-page${error || notice ? " has-message" : ""}`}
      data-testid="pomodoro-page"
    >
      {error ? (
        <p className="pomodoro-message is-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="pomodoro-message" role="status">
          {notice}
        </p>
      ) : null}
      <div className="pomodoro-workspace">
        <section
          className="pomodoro-timer-panel"
          aria-labelledby="pomodoro-focus-heading"
          data-phase={runtime.phase}
        >
          <div className="pomodoro-panel-heading">
            <h2 id="pomodoro-focus-heading">
              {t(`pomodoroPhase_${runtime.phase}`)}
            </h2>
            <span className="pomodoro-status" role="status">
              {t(`pomodoroStatus_${runtime.status}`)}
            </span>
          </div>
          <label className="pomodoro-task-picker">
            <span>{t("pomodoroTask")}</span>
            <select
              aria-label={t("pomodoroTask")}
              value={runtime.task?.id ?? ""}
              disabled={active}
              onChange={(event) => {
                const selected = projects
                  .flatMap((project) =>
                    project.tasks.map((task) => ({
                      id: task.id,
                      name: task.name,
                      projectName: project.name,
                    })),
                  )
                  .find((task) => task.id === event.target.value);
                onAction({ type: "selectTask", task: selected });
              }}
            >
              <option value="">{t("pomodoroFree")}</option>
              {runtime.task && !selectedExists ? (
                <option value={runtime.task.id}>
                  {runtime.task.name} · {runtime.task.projectName}
                </option>
              ) : null}
              {projects.map((project) =>
                project.tasks.length ? (
                  <optgroup label={project.name} key={project.id}>
                    {project.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </select>
          </label>
          <PomodoroCountdown runtime={runtime} dial />
          <div
            className="pomodoro-cycle"
            aria-label={t("pomodoroCycle", {
              completed: runtime.completedInCycle,
              total: runtime.settings.longBreakEvery,
            })}
          >
            <span className="pomodoro-cycle-dots" aria-hidden="true">
              {Array.from(
                { length: runtime.settings.longBreakEvery },
                (_, index) => (
                  <i
                    key={index}
                    className={
                      index < runtime.completedInCycle ? "is-complete" : ""
                    }
                  />
                ),
              )}
            </span>
            <span>
              {t("pomodoroCycle", {
                completed: runtime.completedInCycle,
                total: runtime.settings.longBreakEvery,
              })}
            </span>
          </div>
          <div className="pomodoro-controls">
            <button
              className="primary pomodoro-primary-action"
              onClick={() => onAction({ type: action })}
            >
              {action === "pause" ? (
                <Pause size={18} aria-hidden="true" />
              ) : (
                <Play size={18} aria-hidden="true" />
              )}
              {t(primaryLabel)}
            </button>
            {active ? (
              <button
                className="secondary"
                onClick={() => onAction({ type: "stop" })}
              >
                <Square size={15} aria-hidden="true" />
                {t("pomodoroStop")}
              </button>
            ) : null}
            <button
              className="icon-button pomodoro-reset"
              aria-label={t("pomodoroReset")}
              title={t("pomodoroReset")}
              onClick={() => onAction({ type: "reset" })}
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <p className="pomodoro-manual-hint">
            {t(
              runtime.status === "finished"
                ? "pomodoroFinishedHint"
                : "pomodoroManualHint",
            )}
          </p>
        </section>
        <PomodoroSettingsForm
          key={settingsKey}
          runtime={runtime}
          onAction={onAction}
          onEnableNotifications={onEnableNotifications}
        />
      </div>
      <PomodoroHistory sessions={sessions} />
    </div>
  );
}
