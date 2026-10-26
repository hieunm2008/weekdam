import { useState } from "react";
import { useTranslation } from "react-i18next";
import { shiftDate, today, type Plan } from "../domain";
import {
  applyExam,
  previewExam,
  type Availability,
  type ExamPreview,
} from "./planning";

export default function ExamTool({
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
  onApply: (next: Plan) => void;
}) {
  const { i18n } = useTranslation(),
    en = i18n.language.startsWith("en");
  const [subject, setSubject] = useState(en ? "Final exam" : "Ôn thi cuối kỳ"),
    [startDate, setStart] = useState(today),
    [examDate, setExam] = useState(() => shiftDate(today(), 21)),
    [sessionMinutes, setDuration] = useState(50);
  const [topics, setTopics] = useState([
    { name: en ? "Core concepts" : "Kiến thức nền tảng", minutes: 150 },
    { name: en ? "Practice exams" : "Luyện đề", minutes: 100 },
  ]);
  const [availability, setAvailability] = useState<Availability[]>(
    [0, 2, 4].map((day) => ({ day, startTime: "19:00", endTime: "21:00" })),
  );
  const [preview, setPreview] = useState<ExamPreview | null>(null),
    [error, setError] = useState("");
  const dayNames = en
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  const reset = () => {
    setPreview(null);
    setError("");
  };
  return (
    <section className="pro-panel">
      <h2>{en ? "Automatic exam planning" : "Ôn thi tự động"}</h2>
      <p className="muted">
        {en
          ? "50 minutes · Schedule around your availability"
          : "50 phút · Lập lịch theo giờ rảnh"}
      </p>
      {!allowed ? (
        <p className="warning">
          {en
            ? "Example inputs. Sign in and activate Pro to calculate and apply your own plan."
            : "Đầu vào mẫu. Đăng nhập và kích hoạt Pro để tính và áp dụng kế hoạch của bạn."}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!allowed || !(canUsePro?.() ?? true)) {
            onRequire();
            return;
          }
          try {
            setPreview(
              previewExam(plan, {
                subject,
                startDate,
                examDate,
                sessionMinutes,
                topics,
                availability,
              }),
            );
            setError("");
          } catch (err) {
            setError(
              en
                ? "Check your dates (up to 180 days), topics and available hours."
                : "Kiểm tra khoảng ngày (tối đa 180 ngày), nội dung và giờ rảnh.",
            );
          }
        }}
        onChange={reset}
      >
        <div className="pro-fields">
          <label className="full">
            {en ? "Subject / exam" : "Môn học / kỳ thi"}
            <input
              required
              maxLength={300}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            {en ? "Start date" : "Ngày bắt đầu"}
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            {en ? "Exam date" : "Ngày thi"}
            <input
              required
              type="date"
              min={startDate ? shiftDate(startDate, 1) : undefined}
              max={startDate ? shiftDate(startDate, 180) : undefined}
              value={examDate}
              onChange={(e) => setExam(e.target.value)}
            />
          </label>
          <label>
            {en ? "Minutes per session" : "Số phút mỗi buổi"}
            <input
              required
              type="number"
              min={1}
              max={1439}
              value={sessionMinutes}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
        </div>
        <h3>{en ? "Topics in learning order" : "Nội dung theo thứ tự học"}</h3>
        <p className="pro-hint">
          {en ? "Topic · estimated minutes" : "Nội dung · số phút dự kiến"}
        </p>
        {topics.map((topic, index) => (
          <div className="pro-topic" key={index}>
            <label>
              <span className="sr-only">
                {en ? "Topic" : "Nội dung"} {index + 1}
              </span>
              <input
                required
                maxLength={500}
                value={topic.name}
                onChange={(e) =>
                  setTopics(
                    topics.map((t, i) =>
                      i === index ? { ...t, name: e.target.value } : t,
                    ),
                  )
                }
              />
            </label>
            <label>
              <span className="sr-only">
                {en ? "Minutes" : "Phút"} {index + 1}
              </span>
              <input
                required
                type="number"
                min={1}
                max={259020}
                value={topic.minutes}
                onChange={(e) =>
                  setTopics(
                    topics.map((t, i) =>
                      i === index
                        ? { ...t, minutes: Number(e.target.value) }
                        : t,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              aria-label={`${en ? "Remove topic" : "Xóa nội dung"} ${index + 1}`}
              disabled={topics.length === 1}
              onClick={() => {
                reset();
                setTopics(topics.filter((_, i) => i !== index));
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => {
            reset();
            setTopics([...topics, { name: "", minutes: 50 }]);
          }}
        >
          {en ? "Add topic" : "Thêm nội dung"}
        </button>
        <h3 style={{ marginTop: 24 }}>
          {en ? "Available hours" : "Giờ rảnh theo thứ"}
        </h3>
        <div className="pro-checks">
          {dayNames.map((name, day) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={availability.some((a) => a.day === day)}
                onChange={(e) =>
                  setAvailability(
                    e.target.checked
                      ? [
                          ...availability,
                          { day, startTime: "19:00", endTime: "21:00" },
                        ]
                      : availability.filter((a) => a.day !== day),
                  )
                }
              />
              {name}
            </label>
          ))}
        </div>
        {availability.map((slot, index) => (
          <div className="pro-availability" key={`${slot.day}-${index}`}>
            <span>{dayNames[slot.day]}</span>
            <label>
              <span className="sr-only">
                {en ? "Free from" : "Rảnh từ"} {index + 1}
              </span>
              <input
                required
                type="time"
                value={slot.startTime}
                onChange={(e) =>
                  setAvailability(
                    availability.map((a, i) =>
                      i === index ? { ...a, startTime: e.target.value } : a,
                    ),
                  )
                }
              />
            </label>
            <label>
              <span className="sr-only">
                {en ? "Free until" : "Rảnh đến"} {index + 1}
              </span>
              <input
                required
                type="time"
                value={slot.endTime}
                onChange={(e) =>
                  setAvailability(
                    availability.map((a, i) =>
                      i === index ? { ...a, endTime: e.target.value } : a,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              aria-label={en ? "Add another time window" : "Thêm khoảng rảnh"}
              onClick={() => {
                reset();
                setAvailability([
                  ...availability,
                  { day: slot.day, startTime: "08:00", endTime: "10:00" },
                ]);
              }}
            >
              +
            </button>
          </div>
        ))}
        <p className="pro-hint">
          {en
            ? "Uses Vietnam time; excludes exam day, past time, ended weeks and existing calendar blocks."
            : "Dùng giờ Việt Nam; bỏ ngày thi, giờ đã qua, tuần đã kết thúc và các khung lịch bận."}
        </p>
        <div className="pro-actions">
          <button className="primary">
            {en ? "Calculate plan" : "Tính kế hoạch"}
          </button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="pro-error">
          {error}
        </p>
      ) : null}
      {preview ? (
        <div className="pro-preview">
          <h3>{en ? "Preview" : "Xem trước"}</h3>
          <p>
            {preview.sessions.length} {en ? "sessions" : "buổi"} ·{" "}
            {preview.scheduledMinutes}/{preview.requiredMinutes}{" "}
            {en ? "minutes scheduled" : "phút đã xếp"} ·{" "}
            {en ? "missing" : "còn thiếu"} {preview.missingMinutes}{" "}
            {en ? "minutes" : "phút"}
          </p>
          <ul>
            {preview.sessions.map((s, i) => (
              <li key={i}>
                {s.date} · {s.startTime}–{s.endTime} · {s.topic}
              </li>
            ))}
          </ul>
          {!preview.complete ? (
            <p className="warning">
              {en
                ? "Not enough free time. Adjust inputs and recalculate before applying."
                : "Chưa đủ giờ rảnh. Điều chỉnh đầu vào rồi tính lại trước khi áp dụng."}
            </p>
          ) : null}
          <button
            className="primary"
            disabled={!preview.complete}
            onClick={() => {
              if (!allowed || !(canUsePro?.() ?? true)) {
                onRequire();
                return;
              }
              try {
                onApply(applyExam(plan, preview));
                setPreview(null);
              } catch {
                setError(
                  en
                    ? "Calendar changed. Recalculate the preview."
                    : "Lịch đã thay đổi. Hãy tính lại bản xem trước.",
                );
              }
            }}
          >
            {en ? "Apply entire plan" : "Áp dụng toàn bộ kế hoạch"}
          </button>
          <p className="pro-hint">
            {en
              ? "One Undo restores the whole operation. Edit saved sessions in the calendar."
              : "Một lần Undo hoàn tác toàn bộ. Sau khi lưu, chỉnh các buổi trong lịch."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
