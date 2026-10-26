import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { id, weekAt, type Plan } from "../domain";
import {
  applyTemplate,
  builtInTemplates,
  captureTemplate,
  previewTemplate,
  type TemplatePreview,
} from "./planning";
import type { PersonalTemplate } from "./types";

interface Props {
  plan: Plan;
  start: string;
  allowed: boolean;
  canUsePro?: () => boolean;
  onRequire: () => void;
  onApply: (next: Plan, requiresPro?: boolean) => void;
}

export default function TemplatesTool({
  plan,
  start,
  allowed,
  canUsePro,
  onRequire,
  onApply,
}: Props) {
  const { i18n } = useTranslation(),
    en = i18n.language.startsWith("en");
  const [selected, setSelected] = useState<string[]>([]),
    [name, setName] = useState("");
  const [preview, setPreview] = useState<TemplatePreview | null>(null),
    [previewName, setPreviewName] = useState("");
  const [keepConflicts, setKeepConflicts] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null),
    [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const week = weekAt(plan, start),
    personal = plan.pro?.templates ?? [];
  const builtins = builtInTemplates(en ? "en" : "vi");
  const weekdays = en
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const showError = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : "";
    const errors: Record<string, [string, string]> = {
      "destination-ended": [
        "Tuần này đã kết thúc. Hãy mở một tuần khác trong kế hoạch.",
        "This week has ended. Open another week in the planner.",
      ],
      "empty-template": [
        "Hãy chọn ít nhất một project để lưu thành mẫu.",
        "Select at least one project to save as a template.",
      ],
      "template-conflicts": [
        "Lịch đã thay đổi. Xem lại preview và xác nhận giữ lịch trùng.",
        "The schedule changed. Review the preview and confirm the overlaps.",
      ],
      "invalid-template": [
        "Nhập tên mẫu từ 1 đến 300 ký tự.",
        "Enter a template name between 1 and 300 characters.",
      ],
    };
    setError(
      errors[code]?.[en ? 1 : 0] ??
        (en
          ? "Unable to apply this template. Review the selected week and try again."
          : "Chưa áp dụng được mẫu. Kiểm tra tuần đã chọn và thử lại."),
    );
  };
  const openPreview = (template: PersonalTemplate) => {
    setError("");
    setMessage("");
    try {
      setPreview(previewTemplate(plan, template, start));
      setPreviewName(template.name);
      setKeepConflicts(false);
    } catch (cause) {
      setPreview(null);
      showError(cause);
    }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || (canUsePro && !canUsePro())) {
      onRequire();
      return;
    }
    setError("");
    setMessage("");
    try {
      const template = captureTemplate(week, selected, name, id());
      onApply({
        ...plan,
        pro: { ...plan.pro, templates: [...personal, template] },
      });
      setName("");
      setSelected([]);
      setMessage(
        en
          ? "Your template was saved. You can reuse it in any open week."
          : "Đã lưu mẫu riêng. Bạn có thể dùng lại trong bất kỳ tuần đang mở nào.",
      );
    } catch (cause) {
      showError(cause);
    }
  };
  const rename = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed || trimmed.length > 300) {
      showError(new Error("invalid-template"));
      return;
    }
    onApply(
      {
        ...plan,
        pro: {
          ...plan.pro,
          templates: personal.map((template) =>
            template.id === editingId
              ? { ...template, name: trimmed }
              : template,
          ),
        },
      },
      false,
    );
    setEditingId(null);
    setError("");
  };
  const remove = (templateId: string) => {
    onApply(
      {
        ...plan,
        pro: {
          ...plan.pro,
          templates: personal.filter((template) => template.id !== templateId),
        },
      },
      false,
    );
    setDeletingId(null);
    if (preview?.templateId === templateId) setPreview(null);
  };
  const apply = () => {
    if (!allowed || (canUsePro && !canUsePro())) {
      onRequire();
      return;
    }
    if (!preview) return;
    setError("");
    try {
      onApply(applyTemplate(plan, preview, keepConflicts));
      setPreview(null);
      setMessage(
        en
          ? "Template added to your plan. You can undo this entire change once."
          : "Đã thêm mẫu vào kế hoạch. Có thể Undo toàn bộ thao tác một lần.",
      );
    } catch (cause) {
      showError(cause);
    }
  };
  return (
    <section className="pro-panel" aria-labelledby="templates-title">
      <h2 id="templates-title">
        {en ? "Plan template library" : "Thư viện mẫu kế hoạch"}
      </h2>
      <p>
        {en
          ? "Start with a ready-made study routine, or save projects from your own week. Each use creates independent tasks with fresh progress."
          : "Bắt đầu từ một lộ trình có sẵn, hoặc lưu các project trong tuần của bạn. Mỗi lần áp dụng tạo công việc độc lập và đặt lại tiến độ."}
      </p>
      <p className="pro-hint">
        {en
          ? `Destination: week of ${start}. Deadlines shift with the week; weekdays and hours stay the same.`
          : `Tuần áp dụng: ${start}. Deadline dịch theo tuần; giữ nguyên thứ và khung giờ.`}
      </p>
      {error ? (
        <p className="pro-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="pro-success" role="status">
          {message}
        </p>
      ) : null}
      <div>
        {builtins.map((template) => (
          <div className="pro-row" key={template.id}>
            <div>
              <strong>{template.name}</strong>
              <small>
                {en
                  ? "3 timed study sessions · ready to customize"
                  : "3 buổi học có giờ · sẵn sàng điều chỉnh"}
              </small>
            </div>
            <button className="secondary" onClick={() => openPreview(template)}>
              {en ? "Preview" : "Xem trước"}
            </button>
          </div>
        ))}
      </div>
      <div className="pro-preview">
        <h3>{en ? "Your templates" : "Mẫu riêng của bạn"}</h3>
        {!personal.length ? (
          <p className="muted">
            {en
              ? "Save a weekly routine below to reuse it later."
              : "Lưu lịch học trong tuần ở bên dưới để tái sử dụng."}
          </p>
        ) : (
          personal.map((template) => (
            <div className="pro-row" key={template.id}>
              {editingId === template.id ? (
                <form onSubmit={rename} className="pro-actions">
                  <label>
                    {en ? "Template name" : "Tên mẫu"}
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                      maxLength={300}
                      autoFocus
                    />
                  </label>
                  <button className="primary" type="submit">
                    {en ? "Save name" : "Lưu tên"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    {en ? "Cancel" : "Hủy"}
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{template.name}</strong>
                    <small>
                      {template.projects.length} {en ? "projects" : "project"}
                    </small>
                  </div>
                  <div className="pro-actions">
                    <button
                      className="secondary"
                      onClick={() => openPreview(template)}
                    >
                      {en ? "Preview" : "Xem trước"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditingId(template.id);
                        setEditingName(template.name);
                      }}
                    >
                      {en ? "Rename" : "Đổi tên"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setDeletingId(template.id)}
                    >
                      {en ? "Delete" : "Xóa"}
                    </button>
                  </div>
                </>
              )}
              {deletingId === template.id ? (
                <div
                  className="pro-actions"
                  role="group"
                  aria-label={
                    en ? "Confirm template deletion" : "Xác nhận xóa mẫu"
                  }
                >
                  <span>
                    {en
                      ? "Delete this saved template? Existing plans will stay."
                      : "Xóa mẫu đã lưu này? Kế hoạch đã tạo vẫn được giữ."}
                  </span>
                  <button
                    className="secondary"
                    onClick={() => remove(template.id)}
                  >
                    {en ? "Confirm delete" : "Xác nhận xóa"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setDeletingId(null)}
                  >
                    {en ? "Keep template" : "Giữ mẫu"}
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <form onSubmit={save}>
        <h3>
          {en ? "Save this week as a template" : "Lưu tuần này thành mẫu"}
        </h3>
        <label>
          {en ? "Template name" : "Tên mẫu"}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={300}
            required
            placeholder={en ? "My study routine" : "Lịch học của tôi"}
          />
        </label>
        <fieldset className="pro-checks">
          <legend>{en ? "Choose projects" : "Chọn project"}</legend>
          {week.projects.map((project) => (
            <label key={project.id}>
              <input
                type="checkbox"
                checked={selected.includes(project.id)}
                onChange={(event) =>
                  setSelected((value) =>
                    event.target.checked
                      ? [...value, project.id]
                      : value.filter((key) => key !== project.id),
                  )
                }
              />
              {project.name}
            </label>
          ))}
          {!week.projects.length ? (
            <p className="pro-hint">
              {en
                ? "Add a project to this week first."
                : "Thêm project vào tuần này trước khi tạo mẫu riêng."}
            </p>
          ) : null}
        </fieldset>
        <button
          className="secondary"
          type="submit"
          disabled={!week.projects.length}
        >
          {en ? "Save personal template" : "Lưu mẫu riêng"}
        </button>
      </form>
      {preview ? (
        <div className="pro-preview" aria-labelledby="template-preview-title">
          <h3 id="template-preview-title">
            {en ? "Preview" : "Xem trước"}: {previewName}
          </h3>
          <p>
            {en
              ? `Week of ${preview.targetWeek} · ${preview.projects.length} projects`
              : `Tuần ${preview.targetWeek} · ${preview.projects.length} project`}
          </p>
          <ul>
            {preview.projects.flatMap((project) =>
              project.tasks.map((task) => (
                <li key={task.id}>
                  <strong>{project.name}</strong> · {task.name}
                  {task.deadline
                    ? ` · ${en ? "due" : "hạn"} ${task.deadline.replace("T", " ")}`
                    : ""}
                  {task.subtasks.map((step) => (
                    <span key={step.id}>
                      {" "}
                      · {weekdays[step.day]}
                      {step.startTime
                        ? ` ${step.startTime}–${step.endTime}`
                        : ""}
                    </span>
                  ))}
                </li>
              )),
            )}
          </ul>
          {preview.conflicts.length ? (
            <>
              <p>
                {en
                  ? `${preview.conflicts.length} sessions overlap your schedule.`
                  : `${preview.conflicts.length} buổi trùng khung giờ với lịch hiện có.`}
              </p>
              <ul>
                {preview.conflicts.map((conflict, index) => (
                  <li key={index}>
                    {conflict.date} · {conflict.startTime}–{conflict.endTime}
                  </li>
                ))}
              </ul>
              <label>
                <input
                  type="checkbox"
                  checked={keepConflicts}
                  onChange={(event) => setKeepConflicts(event.target.checked)}
                />{" "}
                {en
                  ? "Keep these overlapping sessions"
                  : "Tôi đồng ý giữ các buổi trùng giờ"}
              </label>
            </>
          ) : (
            <p className="pro-hint">
              {en ? "No schedule overlaps." : "Không trùng khung giờ."}
            </p>
          )}
          <div className="pro-actions">
            <button
              className="primary"
              disabled={preview.conflicts.length > 0 && !keepConflicts}
              onClick={apply}
            >
              {en ? "Add to this week" : "Thêm vào tuần này"}
            </button>
            <button className="secondary" onClick={() => setPreview(null)}>
              {en ? "Close preview" : "Đóng preview"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
