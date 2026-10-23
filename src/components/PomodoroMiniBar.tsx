import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Pause, Play, Square, Timer } from "lucide-react";
import {
  remainingPomodoroMs,
  type PomodoroAction,
  type PomodoroRuntime,
} from "../pomodoro";
import "../pomodoro.css";

export function formatPomodoroTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function nextPomodoroLabel(runtime: PomodoroRuntime): string {
  if (runtime.phase !== "focus") return "pomodoroNextFocus";
  return runtime.completedInCycle >= runtime.settings.longBreakEvery
    ? "pomodoroNextLongBreak"
    : "pomodoroNextShortBreak";
}

export function PomodoroCountdown({
  runtime,
  dial = false,
}: {
  runtime: PomodoroRuntime;
  dial?: boolean;
}) {
  const { t } = useTranslation();
  const [, setClock] = useState(0);
  useEffect(() => {
    if (runtime.status !== "running") return;
    const timer = window.setInterval(
      () => setClock((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [runtime.status]);
  const remaining = remainingPomodoroMs(runtime, Date.now());
  const countdown = (
    <span role="timer" aria-label={t("pomodoroRemaining")} aria-live="off">
      {formatPomodoroTime(remaining)}
    </span>
  );
  if (!dial) return countdown;
  return (
    <div className="pomodoro-dial">
      <svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">
        <circle className="pomodoro-dial-track" cx="160" cy="160" r="150" />
        <circle
          className="pomodoro-dial-progress"
          cx="160"
          cy="160"
          r="150"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={
            1 - remaining / Math.max(1, runtime.plannedDurationMs)
          }
        />
      </svg>
      <div className="pomodoro-dial-content">
        {countdown}
        <span className="pomodoro-dial-label">
          {t(`pomodoroPhase_${runtime.phase}`)}
        </span>
      </div>
    </div>
  );
}

export interface PomodoroMiniBarProps {
  runtime: PomodoroRuntime;
  onAction: (action: PomodoroAction) => void;
  onOpen: () => void;
}

export function PomodoroMiniBar({
  runtime,
  onAction,
  onOpen,
}: PomodoroMiniBarProps) {
  const { t } = useTranslation();
  const primaryAction =
    runtime.status === "running"
      ? "pause"
      : runtime.status === "paused"
        ? "resume"
        : runtime.status === "finished"
          ? "next"
          : "start";
  const primaryLabel =
    primaryAction === "next"
      ? nextPomodoroLabel(runtime)
      : `pomodoro${primaryAction[0].toUpperCase()}${primaryAction.slice(1)}`;
  return (
    <section
      className="pomodoro-minibar"
      data-testid="pomodoro-minibar"
      aria-label={t("pomodoro")}
    >
      <button
        className="pomodoro-mini-open"
        onClick={onOpen}
        aria-label={t("pomodoroOpen")}
      >
        <Timer size={20} aria-hidden="true" />
        <span>
          <strong>{runtime.task?.name || t("pomodoroFree")}</strong>
          <small>
            {t(`pomodoroPhase_${runtime.phase}`)} ·{" "}
            {t(`pomodoroStatus_${runtime.status}`)}
          </small>
        </span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </button>
      <PomodoroCountdown runtime={runtime} />
      <div className="pomodoro-mini-actions">
        <button
          className="icon-button"
          aria-label={t(primaryLabel)}
          title={t(primaryLabel)}
          onClick={() => onAction({ type: primaryAction })}
        >
          {primaryAction === "pause" ? <Pause size={18} /> : <Play size={18} />}
        </button>
        {runtime.status === "running" || runtime.status === "paused" ? (
          <button
            className="icon-button"
            aria-label={t("pomodoroStop")}
            title={t("pomodoroStop")}
            onClick={() => onAction({ type: "stop" })}
          >
            <Square size={16} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default PomodoroMiniBar;
