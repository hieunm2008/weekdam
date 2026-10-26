import { useState } from "react";
import { useTranslation } from "react-i18next";
import { shiftDate, today, type Plan, type Weight } from "../domain";
import {
  applyRecurrence,
  editOccurrence,
  previewRecurrence,
  type RecurrencePreview,
  type OccurrencePatch,
} from "./planning";

export default function RecurrenceTool({
  plan,
  allowed,
  canUsePro,
  onRequire,
  onApply,
}: {
  plan: Plan;
  allowed: boolean;
  canUsePro?: () => boolean;
  onRequire: () => void;
  onApply: (next: Plan, requiresPro?: boolean) => void;
}) {
  const { i18n } = useTranslation(),
    en = i18n.language.startsWith("en");
  const [name, setName] = useState(en ? "Weekly study" : "Học định kỳ"),
    [note, setNote] = useState(""),
    [weight, setWeight] = useState<Weight>(1),
    [days, setDays] = useState([0, 2, 4]);
  const [startDate, setStart] = useState(today),
    [endDate, setEnd] = useState(() => shiftDate(today(), 83)),
    [startTime, setFrom] = useState("19:00"),
    [endTime, setTo] = useState("19:50");
  const [preview, setPreview] = useState<RecurrencePreview | null>(null),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(""),
    [scope, setScope] = useState<"single" | "future" | "stop">("single"),
    [patch, setPatch] = useState<OccurrencePatch>({});
  const names = en
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  const occurrences = plan.weeks
    .flatMap((w) =>
      w.projects.flatMap((p) =>
        p.tasks
          .filter((t) => t.source?.kind === "recurrence")
          .map((t) => ({
            task: t,
            date: shiftDate(w.start, t.subtasks[0]?.day ?? 0),
            ended: w.ended,
          })),
      ),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const reset = () => {
    setPreview(null);
    setConfirm(false);
    setError("");
  };
  const runEdit = (remove = false) => {
    try {
      onApply(
        editOccurrence(plan, selected, remove ? null : patch, scope),
        false,
      );
      setSelected("");
      setError("");
    } catch {
      setError(
        en
          ? "Select an editable occurrence and valid times."
          : "Chọn buổi có thể sửa và nhập giờ hợp lệ.",
      );
    }
  };
  return (
    <section className="pro-panel">
      <h2>{en ? "Recurring tasks & classes" : "Lịch học lặp lại"}</h2>
      <p className="muted">
        {en
          ? "Materialize a fixed schedule for 12 weeks, up to 26 weeks."
          : "Tạo sẵn lịch trong 12 tuần, tối đa 26 tuần."}
      </p>
      <form
        onChange={reset}
        onSubmit={(e) => {
          e.preventDefault();
          if (!allowed || !(canUsePro?.() ?? true)) {
            onRequire();
            return;
          }
          try {
            setPreview(
              previewRecurrence(plan, {
                name,
                note,
                weight,
                days,
                startDate,
                endDate,
                startTime,
                endTime,
              }),
            );
            setError("");
          } catch {
            setError(
              en
                ? "Check dates (up to 26 weeks), weekdays and times."
                : "Kiểm tra khoảng ngày (tối đa 26 tuần), thứ và giờ bắt đầu/kết thúc.",
            );
          }
        }}
      >
        <div className="pro-fields">
          <label className="full">
            {en ? "Name" : "Tên lịch lặp"}
            <input
              required
              maxLength={300}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="full">
            {en ? "Notes" : "Ghi chú"}
            <textarea
              maxLength={10000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label>
            {en ? "Difficulty" : "Độ khó"}
            <select
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value) as Weight)}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? "Start date" : "Bắt đầu từ ngày"}
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value) setEnd(shiftDate(e.target.value, 83));
              }}
            />
          </label>
          <label>
            {en ? "End date" : "Kết thúc ngày"}
            <input
              required
              type="date"
              min={startDate}
              max={startDate ? shiftDate(startDate, 181) : undefined}
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            {en ? "Starts at" : "Giờ bắt đầu"}
            <input
              required
              type="time"
              value={startTime}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {en ? "Ends at" : "Giờ kết thúc"}
            <input
              required
              type="time"
              value={endTime}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="pro-checks">
          {names.map((n, d) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={days.includes(d)}
                onChange={(e) =>
                  setDays(
                    e.target.checked
                      ? [...days, d]
                      : days.filter((x) => x !== d),
                  )
                }
              />
              {n}
            </label>
          ))}
        </div>
        <button className="primary">
          {en ? "Preview recurring schedule" : "Xem trước lịch lặp"}
        </button>
      </form>
      {error ? (
        <p className="pro-error" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? (
        <div className="pro-preview">
          <h3>
            {preview.sessions.length} {en ? "occurrences" : "buổi"} ·{" "}
            {preview.conflicts.length} {en ? "conflicts" : "khung giờ trùng"}
          </h3>
          <ul>
            {preview.sessions.map((s, i) => (
              <li key={i}>
                {s.date} · {s.startTime}–{s.endTime}
                {preview.conflicts.some((c) => c.date === s.date) ? " ⚠" : ""}
              </li>
            ))}
          </ul>
          {preview.conflicts.length ? (
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              {en
                ? "Keep conflicting sessions"
                : "Tôi xác nhận giữ các buổi trùng lịch"}
            </label>
          ) : null}
          <button
            className="primary"
            disabled={
              !preview.sessions.length ||
              (!!preview.conflicts.length && !confirm)
            }
            onClick={() => {
              if (!allowed || !(canUsePro?.() ?? true)) {
                onRequire();
                return;
              }
              try {
                onApply(applyRecurrence(plan, preview, confirm));
                reset();
              } catch {
                setError(
                  en
                    ? "Calendar changed. Preview again."
                    : "Lịch đã thay đổi. Hãy xem trước lại.",
                );
              }
            }}
          >
            {en ? "Create all occurrences" : "Tạo toàn bộ các buổi"}
          </button>
        </div>
      ) : null}
      <div className="pro-preview">
        <h3>{en ? "Manage saved occurrences" : "Quản lý các buổi đã tạo"}</h3>
        <p className="pro-hint">
          {en
            ? "Completed, individually edited and ended-week history are preserved when editing future sessions. Deleted occurrences are never regenerated."
            : "Sửa tương lai giữ buổi hoàn thành, buổi đã sửa riêng và lịch sử tuần kết thúc. Buổi đã xóa không được sinh lại."}
        </p>
        <label>
          {en ? "Occurrence" : "Chọn buổi"}
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              const task = occurrences.find(
                (o) => o.task.id === e.target.value,
              )?.task;
              setPatch(
                task
                  ? {
                      name: task.name,
                      note: task.note,
                      weight: task.subtasks[0]?.weight ?? 1,
                      startTime: task.subtasks[0]?.startTime,
                      endTime: task.subtasks[0]?.endTime,
                    }
                  : {},
              );
            }}
          >
            <option value="">—</option>
            {occurrences.map((o) => (
              <option key={o.task.id} value={o.task.id} disabled={o.ended}>
                {o.date} · {o.task.name}
                {o.task.source?.detached ? " *" : ""}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <>
            <label>
              {en ? "Change scope" : "Phạm vi thay đổi"}
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as typeof scope)}
              >
                <option value="single">
                  {en ? "Only this occurrence" : "Chỉ buổi này"}
                </option>
                <option value="future">
                  {en
                    ? "This and future occurrences"
                    : "Buổi này và các buổi sau"}
                </option>
                <option value="stop">
                  {en ? "Stop from this occurrence" : "Dừng lịch từ buổi này"}
                </option>
              </select>
            </label>
            {scope !== "stop" ? (
              <div className="pro-fields">
                <label className="full">
                  {en ? "New name" : "Tên mới"}
                  <input
                    required
                    value={patch.name ?? ""}
                    onChange={(e) =>
                      setPatch({ ...patch, name: e.target.value })
                    }
                  />
                </label>
                <label className="full">
                  {en ? "New notes" : "Ghi chú mới"}
                  <textarea
                    value={patch.note ?? ""}
                    onChange={(e) =>
                      setPatch({ ...patch, note: e.target.value })
                    }
                  />
                </label>
                <label>
                  {en ? "Difficulty" : "Độ khó mới"}
                  <select
                    value={patch.weight ?? 1}
                    onChange={(e) =>
                      setPatch({
                        ...patch,
                        weight: Number(e.target.value) as Weight,
                      })
                    }
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {en ? "Starts at" : "Giờ mới bắt đầu"}
                  <input
                    type="time"
                    value={patch.startTime ?? ""}
                    onChange={(e) =>
                      setPatch({ ...patch, startTime: e.target.value })
                    }
                  />
                </label>
                <label>
                  {en ? "Ends at" : "Giờ mới kết thúc"}
                  <input
                    type="time"
                    value={patch.endTime ?? ""}
                    onChange={(e) =>
                      setPatch({ ...patch, endTime: e.target.value })
                    }
                  />
                </label>
              </div>
            ) : null}
            <div className="pro-actions">
              <button className="secondary" onClick={() => runEdit()}>
                {scope === "stop"
                  ? en
                    ? "Stop schedule"
                    : "Dừng lịch"
                  : en
                    ? "Save changes"
                    : "Lưu thay đổi"}
              </button>
              {scope === "single" ? (
                <button
                  className="secondary danger"
                  onClick={() => runEdit(true)}
                >
                  {en ? "Delete this occurrence" : "Xóa buổi này"}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
