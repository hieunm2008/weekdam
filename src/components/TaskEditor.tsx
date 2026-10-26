import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  clone,
  id,
  taskDone,
  type Task,
  type Project,
  type Subtask,
  type Weight,
} from "../domain";
import { Modal } from "./Modal";
import { useDndAccessibility } from "./dndAccessibility";
import { DifficultyBadge } from "./DifficultyBadge";

function Step({
  step,
  names,
  onChange,
  onDelete,
}: {
  step: Subtask;
  names: string[];
  onChange: (s: Subtask) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const sortable = useSortable({
    id: step.id,
    transition: { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
    data: { label: step.note || names[step.day] },
  });
  return (
    <div
      className="step-row"
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : 1,
      }}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={t("dragSubtask")}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={18} />
      </button>
      <select
        aria-label={t("moveDay")}
        value={step.day}
        onChange={(e) => onChange({ ...step, day: Number(e.target.value) })}
      >
        {names.map((name, i) => (
          <option key={i} value={i}>
            {name}
          </option>
        ))}
      </select>
      <input
        aria-label={t("note")}
        placeholder={t("note")}
        maxLength={10000}
        value={step.note}
        onChange={(e) => onChange({ ...step, note: e.target.value })}
      />
      <select
        className="difficulty-select"
        data-difficulty={step.weight}
        aria-label={t("difficulty")}
        value={step.weight}
        onChange={(e) =>
          onChange({ ...step, weight: Number(e.target.value) as Weight })
        }
      >
        {[1, 2, 3].map((w, i) => (
          <option key={w} value={w}>
            {t(["easy", "medium", "hard"][i])}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="icon-button danger"
        aria-label={t("delete")}
        onClick={onDelete}
      >
        <Trash2 size={16} />
      </button>
      {step.startTime && step.endTime ? (
        <span className="step-time-summary">
          {step.startTime}–{step.endTime}
        </span>
      ) : null}
    </div>
  );
}
export function TaskEditor({
  task,
  projectId,
  projects,
  onSave,
  onDelete,
  onClose,
  calendarMode = false,
}: {
  task: Task;
  projectId: string;
  projects: Project[];
  onSave: (task: Task, pid: string) => void;
  onDelete?: () => void;
  onClose: () => void;
  calendarMode?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => ({
      ...clone(task),
      done: taskDone(task),
    })),
    [pid, setPid] = useState(projectId);
  const names = t("dayNames").split(",");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const accessibility = useDndAccessibility();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.name.trim() && pid)
      onSave({ ...draft, name: draft.name.trim() }, pid);
  };
  return (
    <Modal
      title={task.name ? t("editTaskHeading") : t("newTask")}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <label>
          {t("taskName")}
          <input
            autoFocus
            required
            enterKeyHint="done"
            maxLength={500}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            {t("project")}
            <select value={pid} onChange={(e) => setPid(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("deadline")}
            <input
              type="datetime-local"
              value={
                draft.deadline?.length === 10
                  ? draft.deadline + "T17:00"
                  : (draft.deadline ?? "")
              }
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
          </label>
        </div>
        <label>
          {t("note")}
          <textarea
            maxLength={10000}
            rows={2}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
        <div className="section-label">
          {t("subtasks")}
          <span>
            {t("difficulty")}: 1 / 2 / 3 {t("units")}
          </span>
        </div>
        <div
          className="difficulty-legend"
          role="group"
          aria-label={t("difficulty")}
        >
          <DifficultyBadge value={1} />
          <DifficultyBadge value={2} />
          <DifficultyBadge value={3} />
        </div>
        <div className="day-picker">
          {names.map((name, day) => (
            <button
              type="button"
              key={day}
              className={
                draft.subtasks.some((s) => s.day === day) ? "selected" : ""
              }
              aria-label={name}
              aria-pressed={
                calendarMode
                  ? undefined
                  : draft.subtasks.some((s) => s.day === day)
              }
              onClick={() =>
                setDraft({
                  ...draft,
                  subtasks:
                    !calendarMode && draft.subtasks.some((s) => s.day === day)
                      ? draft.subtasks.filter((s) => s.day !== day)
                      : [
                          ...draft.subtasks,
                          {
                            id: id(),
                            day,
                            weight: 1,
                            note: "",
                            done: false,
                            missed: [],
                          },
                        ],
                })
              }
            >
              {t("mobileShort").split(",")[day]}
            </button>
          ))}
        </div>
        <DndContext
          accessibility={accessibility}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (over && active.id !== over.id)
              setDraft({
                ...draft,
                subtasks: arrayMove(
                  draft.subtasks,
                  draft.subtasks.findIndex((s) => s.id === active.id),
                  draft.subtasks.findIndex((s) => s.id === over.id),
                ),
              });
          }}
        >
          <SortableContext
            items={draft.subtasks.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {draft.subtasks.map((step) => (
              <Step
                key={step.id}
                step={step}
                names={names}
                onChange={(s) =>
                  setDraft({
                    ...draft,
                    subtasks: draft.subtasks.map((old) =>
                      old.id === s.id ? s : old,
                    ),
                  })
                }
                onDelete={() =>
                  setDraft({
                    ...draft,
                    subtasks: draft.subtasks.filter((s) => s.id !== step.id),
                  })
                }
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setDraft({
              ...draft,
              subtasks: [
                ...draft.subtasks,
                {
                  id: id(),
                  day: draft.subtasks.at(-1)?.day ?? 0,
                  weight: 1,
                  note: "",
                  done: false,
                  missed: [],
                },
              ],
            })
          }
        >
          <Plus size={17} />
          {t("newSubtask")}
        </button>
        <footer className="dialog-actions">
          {onDelete ? (
            <button
              type="button"
              className="text-button danger"
              onClick={onDelete}
            >
              <Trash2 size={16} />
              {t("deleteTask")}
            </button>
          ) : (
            <span />
          )}
          <div>
            <button type="button" className="secondary" onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" className="primary">
              {t("save")}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
