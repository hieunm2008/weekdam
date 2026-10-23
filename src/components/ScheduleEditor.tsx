import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import {
  id,
  shiftDate,
  type Project,
  type Subtask,
  type Weight,
} from "../domain";
import { minutesToTime, validTimeRange } from "../calendar";
import { Modal } from "./Modal";

export interface ScheduleDraft {
  taskId: string;
  day: number;
  startMinute: number;
  step?: Subtask;
}

export function ScheduleEditor({
  start,
  projects,
  initial,
  onSave,
  onDelete,
  onUntime,
  onClose,
}: {
  start: string;
  projects: Project[];
  initial: ScheduleDraft;
  onSave: (taskId: string, projectId: string, step: Subtask) => void;
  onDelete?: () => void;
  onUntime?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tasks = projects.flatMap((project) =>
    project.tasks.map((task) => ({ project, task })),
  );
  const [taskId, setTaskId] = useState(initial.taskId);
  const [sessionDate, setSessionDate] = useState(() =>
    shiftDate(start, initial.day),
  );
  const minute = Math.max(0, Math.min(1438, initial.startMinute));
  const [startTime, setStartTime] = useState(
    initial.step?.startTime ?? minutesToTime(minute),
  );
  const [endTime, setEndTime] = useState(
    initial.step?.endTime ?? minutesToTime(Math.min(minute + 60, 1439)),
  );
  const [weight, setWeight] = useState<Weight>(initial.step?.weight ?? 1);
  const [note, setNote] = useState(initial.step?.note ?? "");
  const [done, setDone] = useState(initial.step?.done ?? false);
  const selected = tasks.find(({ task }) => task.id === taskId);
  const day = Math.round(
    (Date.parse(sessionDate) - Date.parse(start)) / 86400000,
  );
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(sessionDate) &&
    day >= 0 &&
    day <= 6 &&
    shiftDate(start, day) === sessionDate;
  const validTimes = validTimeRange(startTime, endTime);
  const error = !validDate
    ? t("weekDateError")
    : !validTimes
      ? t("invalidTimeRange")
      : "";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || error) return;
    onSave(taskId, selected.project.id, {
      ...(initial.step ?? { id: id(), missed: [] }),
      day,
      startTime,
      endTime,
      weight,
      note,
      done,
    });
  };
  return (
    <Modal title={t("scheduleHeading")} onClose={onClose}>
      <form onSubmit={submit}>
        <label>
          {t("scheduleTask")}
          <select
            autoFocus
            required
            value={taskId}
            disabled={!!initial.step}
            onChange={(event) => setTaskId(event.target.value)}
          >
            {tasks.map(({ project, task }) => (
              <option key={task.id} value={task.id}>
                {task.name} · {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("sessionDate")}
          <input
            type="date"
            required
            min={start}
            max={shiftDate(start, 6)}
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            {t("startTime")}
            <input
              type="time"
              required
              step={60}
              value={startTime}
              aria-invalid={!validTimes}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            {t("endTime")}
            <input
              type="time"
              required
              step={60}
              value={endTime}
              aria-invalid={!validTimes}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="schedule-error" role="alert">
            {error}
          </p>
        ) : null}
        <label>
          {t("difficulty")}
          <select
            className="difficulty-select"
            data-difficulty={weight}
            value={weight}
            onChange={(event) =>
              setWeight(Number(event.target.value) as Weight)
            }
          >
            {[1, 2, 3].map((value, index) => (
              <option key={value} value={value}>
                {t(["easy", "medium", "hard"][index])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("note")}
          <textarea
            rows={2}
            maxLength={10000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={done}
            onChange={(event) => setDone(event.target.checked)}
          />
          {t("completed")}
        </label>
        {onUntime ? (
          <button type="button" className="text-button" onClick={onUntime}>
            {t("removeTime")}
          </button>
        ) : null}
        <footer className="dialog-actions">
          {onDelete ? (
            <button
              type="button"
              className="text-button danger"
              onClick={onDelete}
            >
              <Trash2 size={16} />
              {t("removeSession")}
            </button>
          ) : (
            <span />
          )}
          <div>
            <button type="button" className="secondary" onClick={onClose}>
              {t("cancel")}
            </button>
            <button className="primary" disabled={!!error || !selected}>
              {t("save")}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
