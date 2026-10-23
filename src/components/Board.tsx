import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  useDroppable,
  closestCenter,
  type KeyboardCoordinateGetter,
  type CollisionDetection,
  type DragMoveEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreHorizontal,
  Plus,
  CalendarClock,
  StickyNote,
  Clock3,
  Timer,
} from "lucide-react";
import {
  dayCards,
  shiftDate,
  type Project,
  type Task,
  type Subtask,
  type BoardAnchor,
} from "../domain";
import { useDndAccessibility } from "./dndAccessibility";
import { DifficultyBadge } from "./DifficultyBadge";

interface Row {
  project: Project;
  task: Task;
  step: Subtask;
  missed: boolean;
  displayDay: number;
}
interface Insertion {
  day: number;
  anchor?: BoardAnchor;
}
const transition = { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" };
function rowsFor(projects: Project[], day: number): Row[] {
  const real = dayCards(projects, day).map((row) => ({
    ...row,
    missed: false,
    displayDay: day,
  }));
  const history = projects.flatMap((project) =>
    project.tasks.flatMap((task) =>
      task.subtasks
        .filter((step) => step.day !== day && step.missed.includes(day))
        .map((step) => ({
          project,
          task,
          step,
          missed: true,
          displayDay: day,
        })),
    ),
  );
  return [...real, ...history];
}
const boardCollision: CollisionDetection = (args) => {
  const x =
    args.pointerCoordinates?.x ??
    args.collisionRect.left + args.collisionRect.width / 2;
  const y =
    args.pointerCoordinates?.y ??
    args.collisionRect.top + args.collisionRect.height / 2;
  const day = args.droppableContainers.find((container) => {
    const rect = args.droppableRects.get(container.id);
    return (
      !container.disabled &&
      container.data.current?.type === "day" &&
      rect &&
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  });
  if (!day) return [];
  const steps = args.droppableContainers.filter(
    (container) =>
      !container.disabled &&
      container.data.current?.type === "step" &&
      container.data.current.day === day.data.current?.day &&
      container.id !== args.active.id,
  );
  const lastBottom = Math.max(
    ...steps.map(
      (container) => args.droppableRects.get(container.id)?.bottom ?? 0,
    ),
  );
  return steps.length && y <= lastBottom + 8
    ? closestCenter({
        ...args,
        collisionRect: {
          left: x,
          right: x,
          top: y,
          bottom: y,
          width: 0,
          height: 0,
        },
        droppableContainers: steps,
      })
    : [{ id: day.id, data: { droppableContainer: day, value: 0 } }];
};

const Card = memo(function Card({
  row,
  ended,
  instant,
  onCheck,
  onEdit,
  onMove,
  onClearMissed,
  onPomodoro,
  overdue,
  insertion,
}: {
  row: Row;
  ended: boolean;
  instant: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onMove: () => void;
  onClearMissed: () => void;
  onPomodoro?: () => void;
  overdue: boolean;
  insertion?: "before" | "after";
}) {
  const { t, i18n } = useTranslation();
  const ordinal =
    row.task.subtasks.findIndex((step) => step.id === row.step.id) + 1;
  const cardName =
    row.task.name +
    (row.task.subtasks.length > 1
      ? " · " +
        t("stepPosition", { index: ordinal, total: row.task.subtasks.length })
      : "");
  const drag = useSortable({
    id: row.missed
      ? "history-" + row.step.id + "-" + row.displayDay
      : row.step.id,
    disabled: ended || row.missed,
    transition: instant ? null : transition,
    data: {
      type: "step",
      day: row.step.day,
      label: cardName + " · " + row.project.name,
    },
  });
  const canStart = (target: EventTarget | null) =>
    target instanceof Element &&
    !target.closest(
      "button,input,textarea,select,a,label,[contenteditable],[data-no-drag]",
    );
  const deadline = row.task.deadline || row.project.deadline;
  const deadlineText = deadline
    ? new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", {
        day: "numeric",
        month: "numeric",
        timeZone: "UTC",
      }).format(new Date(deadline.slice(0, 10) + "T12:00:00Z"))
    : "";
  return (
    <article
      ref={drag.setNodeRef}
      data-step-id={row.missed ? undefined : row.step.id}
      data-insertion={insertion}
      data-dragging={drag.isDragging || undefined}
      className={
        "work-card" +
        (row.step.done && !row.missed ? " is-done" : "") +
        (row.missed ? " is-missed" : "")
      }
      style={{
        transform: CSS.Transform.toString(drag.transform),
        transition: drag.transition,
        opacity: drag.isDragging ? 0.3 : 1,
      }}
      onMouseDown={(event) => {
        if (canStart(event.target)) drag.listeners?.onMouseDown?.(event);
      }}
      onTouchStart={(event) => {
        if (canStart(event.target)) drag.listeners?.onTouchStart?.(event);
      }}
    >
      <div className="card-title">
        <label className="check-target">
          <input
            type="checkbox"
            aria-label={cardName}
            checked={row.step.done && !row.missed}
            disabled={ended || row.missed}
            onChange={onCheck}
          />
        </label>
        <button
          className="task-title"
          aria-label={t("editTask", { name: cardName })}
          title={row.task.name}
          onClick={onEdit}
        >
          {row.task.name}
        </button>
      </div>
      <div
        className={
          "card-footer" +
          (onPomodoro && !ended && !row.missed ? " has-pomodoro" : "")
        }
      >
        <div className="card-info">
          <div className="card-project">
            <span className="project-tag" title={row.project.name}>
              {row.project.name}
            </span>
            {row.task.subtasks.length > 1 ? (
              <span className="step-position">
                {t("stepPosition", {
                  index: ordinal,
                  total: row.task.subtasks.length,
                })}
              </span>
            ) : null}
          </div>
          <div className="card-meta">
            <DifficultyBadge value={row.step.weight} />
            {row.step.startTime && row.step.endTime ? (
              <span className="card-session-time">
                <Clock3 size={14} />
                {row.step.startTime}–{row.step.endTime}
              </span>
            ) : null}
            {deadlineText ? (
              <span className="card-deadline" title={deadline}>
                <CalendarClock size={14} />
                {deadlineText}
              </span>
            ) : null}
            {row.step.note ? (
              <span
                className="note-indicator"
                role="img"
                aria-label={t("hasNote")}
                title={t("hasNote")}
              >
                <StickyNote size={14} />
              </span>
            ) : null}
          </div>
        </div>
        {!ended && !row.missed ? (
          <>
            {onPomodoro ? (
              <button
                className="card-pomodoro"
                aria-label={t("pomodoroNamedTask", { name: row.task.name })}
                onClick={onPomodoro}
              >
                <Timer size={16} aria-hidden="true" />
                <span>{t("pomodoro")}</span>
              </button>
            ) : null}
            <button
              className="icon-button card-menu"
              aria-label={t("moveDay") + " · " + cardName}
              onClick={onMove}
            >
              <MoreHorizontal size={18} />
            </button>
            <button
              className="drag-handle"
              ref={drag.setActivatorNodeRef}
              aria-label={
                t("drag") + " · " + cardName + " · " + row.project.name
              }
              {...drag.attributes}
              {...drag.listeners}
            >
              <GripVertical size={16} />
            </button>
          </>
        ) : null}
      </div>
      {row.missed ? (
        <span className="missed-label">{t("missed")}</span>
      ) : overdue ? (
        <span className="overdue-label">
          <CalendarClock size={13} />
          {t("overdue")}
        </span>
      ) : null}
      {!ended && row.missed ? (
        <button className="text-button clear-missed" onClick={onClearMissed}>
          {t("clearMissed")}
        </button>
      ) : null}
    </article>
  );
});
interface DayProps {
  day: number;
  start: string;
  projects: Project[];
  ended: boolean;
  todayDate: string;
  instant: boolean;
  insertion?: BoardAnchor;
  appendTarget?: boolean;
  onCheck: (id: string) => void;
  onEdit: (task: Task, pid: string) => void;
  onMove: (id: string) => void;
  onAdd: (day: number) => void;
  onClearMissed: (id: string, day: number) => void;
  onPomodoro?: (task: Task, pid: string) => void;
  onFocus?: (day: number) => void;
  mobile?: boolean;
}
const Day = memo(function Day({
  day,
  start,
  projects,
  ended,
  todayDate,
  instant,
  insertion,
  appendTarget,
  onCheck,
  onEdit,
  onMove,
  onAdd,
  onClearMissed,
  onPomodoro,
  onFocus,
  mobile,
}: DayProps) {
  const { t, i18n } = useTranslation();
  const drop = useDroppable({
    id: "day-" + day,
    data: { type: "day", day },
    disabled: ended,
  });
  const rows = useMemo(() => rowsFor(projects, day), [projects, day]);
  const real = rows.filter((row) => !row.missed),
    done = real.filter((row) => row.step.done).length;
  const units = real.reduce((n, row) => n + row.step.weight, 0);
  const doneUnits = real.reduce(
    (n, row) => n + (row.step.done ? row.step.weight : 0),
    0,
  );
  const date = shiftDate(start, day);
  return (
    <section
      ref={drop.setNodeRef}
      className={
        "day-column" +
        (date === todayDate ? " today" : "") +
        (drop.isOver ? " drop-target" : "")
      }
      data-day={day}
    >
      <header className="day-head">
        <button
          className="day-heading"
          onClick={() => onFocus?.(day)}
          aria-label={t("focusDay", { day: t("dayNames").split(",")[day] })}
        >
          <span>
            {mobile
              ? new Intl.DateTimeFormat(
                  i18n.language === "vi" ? "vi-VN" : "en-GB",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  },
                ).format(new Date(date + "T12:00:00Z"))
              : t("mobileShort").split(",")[day]}
          </span>
          {!mobile ? (
            <strong className="date-number">{Number(date.slice(-2))}</strong>
          ) : null}
        </button>
        <span className="day-total">
          {done}/{real.length}
          <small>
            {doneUnits}/{units} {t("units")}
          </small>
        </span>
      </header>
      <SortableContext
        items={real.map((row) => row.step.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="day-cards">
          {rows.map((row) => (
            <Card
              key={row.step.id + (row.missed ? "-missed-" + day : "")}
              row={row}
              ended={ended}
              instant={instant}
              insertion={
                !row.missed && insertion?.id === row.step.id
                  ? insertion.edge
                  : undefined
              }
              overdue={!row.step.done && date < todayDate}
              onCheck={() => onCheck(row.step.id)}
              onEdit={() => onEdit(row.task, row.project.id)}
              onMove={() => onMove(row.step.id)}
              onClearMissed={() => onClearMissed(row.step.id, day)}
              onPomodoro={
                onPomodoro
                  ? () => onPomodoro(row.task, row.project.id)
                  : undefined
              }
            />
          ))}
        </div>
      </SortableContext>
      {appendTarget ? (
        <div className="drop-indicator" aria-hidden="true" />
      ) : null}
      {!rows.length ? <p className="empty-day">{t("emptyDay")}</p> : null}
      {!ended ? (
        <button
          className="add-day"
          aria-label={t("newTask") + " · " + t("dayNames").split(",")[day]}
          onClick={() => onAdd(day)}
        >
          <Plus size={16} />
          <span>{t("newTask")}</span>
        </button>
      ) : null}
    </section>
  );
});
function DayTarget({
  day,
  start,
  selected,
  ended,
  onSelect,
}: {
  day: number;
  start: string;
  selected: boolean;
  ended: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const drop = useDroppable({
    id: "tab-day-" + day,
    data: { type: "day", day },
    disabled: ended,
  });
  return (
    <button
      ref={drop.setNodeRef}
      className={
        (selected ? "selected " : "") + (drop.isOver ? "drop-target" : "")
      }
      aria-label={t("dayNames").split(",")[day]}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {t("mobileShort").split(",")[day]}
      <span>{Number(shiftDate(start, day).slice(-2))}</span>
    </button>
  );
}

export function Board(
  props: Omit<DayProps, "day" | "instant" | "insertion" | "appendTarget"> & {
    focus: number | null;
    mobile?: boolean;
    onShowWeek?: () => void;
    onDrop: (id: string, day: number, anchor?: BoardAnchor) => void;
  },
) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null),
    [insertion, setInsertion] = useState<Insertion | null>(null);
  const [keyboardDrag, setKeyboardDrag] = useState(false),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const navigation = useRef<{
    id: string;
    day: number;
    edge?: "before" | "after";
  } | null>(null);
  const latestInsertion = useRef<Insertion | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    const current = navigation.current;
    const activeRect = args.context.active?.rect.current.translated;
    if (!current || !activeRect) return;
    let id = current.id,
      day = current.day,
      edge = current.edge;
    if (["ArrowLeft", "ArrowRight"].includes(event.code)) {
      day = Math.max(
        0,
        Math.min(6, day + (event.code === "ArrowRight" ? 1 : -1)),
      );
      id = args.context.droppableRects.has("day-" + day)
        ? "day-" + day
        : "tab-day-" + day;
      edge = undefined;
    } else if (["ArrowUp", "ArrowDown"].includes(event.code)) {
      const items = args.context.droppableContainers
        .getEnabled()
        .filter(
          (container) =>
            container.data.current?.type === "step" &&
            container.data.current.day === day,
        )
        .sort(
          (a, b) =>
            (args.context.droppableRects.get(a.id)?.top ?? 0) -
            (args.context.droppableRects.get(b.id)?.top ?? 0),
        );
      const index = items.findIndex((item) => item.id === id);
      const target =
        items[
          Math.max(
            0,
            Math.min(
              items.length - 1,
              (index < 0 ? 0 : index) + (event.code === "ArrowDown" ? 1 : -1),
            ),
          )
        ];
      if (!target) return;
      id = String(target.id);
      edge =
        target.id === args.context.active?.id
          ? undefined
          : event.code === "ArrowDown"
            ? "after"
            : "before";
    } else return;
    const rect = args.context.droppableRects.get(id);
    if (!rect) return;
    event.preventDefault();
    navigation.current = { id, day, edge };
    const selected =
      id === args.context.active?.id
        ? null
        : { day, anchor: edge ? { id, edge } : undefined };
    latestInsertion.current = selected;
    setInsertion(selected);
    return {
      x: rect.left + rect.width / 2 - activeRect.width / 2,
      y:
        rect.top +
        (id.startsWith("day-")
          ? Math.min(90, rect.height / 2)
          : rect.height / 2) -
        activeRect.height / 2,
    };
  };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );
  const collision: CollisionDetection = (args) => {
    pointer.current = args.pointerCoordinates;
    if (navigation.current) {
      const container = args.droppableContainers.find(
        (item) => item.id === navigation.current!.id,
      );
      return container
        ? [
            {
              id: container.id,
              data: { droppableContainer: container, value: 0 },
            },
          ]
        : [];
    }
    return boardCollision(args);
  };
  const updateInsertion = ({ active, over }: DragMoveEvent) => {
    let next: Insertion | null = null;
    const selected = navigation.current;
    if (selected && selected.id !== active.id) {
      next = {
        day: selected.day,
        anchor: selected.edge
          ? { id: selected.id, edge: selected.edge }
          : undefined,
      };
      if (over?.data.current) over.data.current.insertionEdge = selected.edge;
    } else if (!selected && over?.data.current && over.id !== active.id) {
      const day = Number(over.data.current.day);
      if (over.data.current.type === "step") {
        const center = active.rect.current.translated;
        const edge =
          navigation.current?.edge ??
          ((pointer.current?.y ??
            (center ? center.top + center.height / 2 : 0)) >
          over.rect.top + over.rect.height / 2
            ? "after"
            : "before");
        next = { day, anchor: { id: String(over.id), edge } };
      } else next = { day };
      over.data.current.insertionEdge = next.anchor?.edge;
    }
    latestInsertion.current = next;
    setInsertion((previous) =>
      previous?.day === next?.day &&
      previous?.anchor?.id === next?.anchor?.id &&
      previous?.anchor?.edge === next?.anchor?.edge
        ? previous
        : next,
    );
  };
  const reset = () => {
    setActive(null);
    setInsertion(null);
    latestInsertion.current = null;
    navigation.current = null;
    pointer.current = null;
  };
  const activeRow = useMemo(
    () =>
      props.projects
        .flatMap((project) =>
          project.tasks.flatMap((task) =>
            task.subtasks.map((step) => ({ project, task, step })),
          ),
        )
        .find((row) => row.step.id === active),
    [props.projects, active],
  );
  const accessibility = useDndAccessibility();
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={accessibility}
      onDragStart={({ active, activatorEvent }) => {
        const keyboard = activatorEvent instanceof KeyboardEvent;
        navigation.current = keyboard
          ? { id: String(active.id), day: Number(active.data.current?.day) }
          : null;
        setKeyboardDrag(keyboard);
        setActive(String(active.id));
      }}
      onDragMove={updateInsertion}
      onDragOver={(event) => updateInsertion(event)}
      onDragCancel={reset}
      onDragEnd={(event) => {
        updateInsertion(event);
        const target = latestInsertion.current,
          keyboard = !!navigation.current,
          id = String(event.active.id);
        if ((event.over || keyboard) && target) {
          props.onDrop(id, target.day, target.anchor);
          if (props.mobile) props.onFocus?.(target.day);
        }
        reset();
        if (keyboard)
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLButtonElement>(
                `[data-step-id="${window.CSS.escape(id)}"] .drag-handle`,
              )
              ?.focus(),
          );
      }}
    >
      {props.mobile || props.focus !== null ? (
        <div className="day-tabs">
          {Array.from({ length: 7 }, (_, day) => (
            <DayTarget
              key={day}
              day={day}
              start={props.start}
              ended={props.ended}
              selected={props.focus === day}
              onSelect={() => props.onFocus?.(day)}
            />
          ))}
          {!props.mobile ? (
            <button className="all-days" onClick={props.onShowWeek}>
              {t("allDays")}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="week-scroll">
        <div
          className={"week-grid" + (props.focus !== null ? " focused" : "")}
          data-testid="day-work"
        >
          {Array.from({ length: 7 }, (_, day) =>
            props.focus === null || props.focus === day ? (
              <Day
                key={day}
                {...props}
                day={day}
                instant={reduced || keyboardDrag}
                insertion={
                  insertion?.day === day ? insertion.anchor : undefined
                }
                appendTarget={insertion?.day === day && !insertion.anchor}
              />
            ) : null,
          )}
        </div>
      </div>
      <DragOverlay
        style={{ pointerEvents: "none" }}
        dropAnimation={reduced || keyboardDrag ? null : transition}
      >
        {activeRow ? (
          <div className="drag-preview" data-overlay-id={activeRow.step.id}>
            <span>{activeRow.project.name}</span>
            <strong>{activeRow.task.name}</strong>
            <DifficultyBadge value={activeRow.step.weight} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
