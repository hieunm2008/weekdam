import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListPlus,
  Pencil,
  Plus,
  Search,
  Timer,
} from "lucide-react";
import {
  shiftDate,
  taskDone,
  type Project,
  type Task,
  type Weight,
} from "../domain";
import { minutesToTime, timedSessions } from "../calendar";
import { DifficultyBadge } from "./DifficultyBadge";
import "../calendar.css";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_TIME = 9 * 60;
const snapTime = (minute: number) =>
  Math.max(0, Math.min(23 * 60 + 45, Math.round(minute / 15) * 15));
type Session = ReturnType<typeof timedSessions>[number];
type DragData = {
  kind: "task" | "session";
  task: Task;
  pid: string;
  label: string;
  weight: Weight;
  stepId?: string;
  start?: number;
  duration?: number;
};

const calendarCollision: CollisionDetection = (args) => {
  const point = args.pointerCoordinates;
  if (!point) return [];
  const day = args.droppableContainers.find((container) => {
    const rect = args.droppableRects.get(container.id);
    return (
      !container.disabled &&
      rect &&
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  });
  return day
    ? [{ id: day.id, data: { droppableContainer: day, value: 0 } }]
    : [];
};

function pointerY(event: Event): number | undefined {
  if ("clientY" in event) return (event as MouseEvent).clientY;
  if ("touches" in event) {
    const touch =
      (event as TouchEvent).touches[0] ??
      (event as TouchEvent).changedTouches[0];
    return touch?.clientY;
  }
}

function CalendarTask({
  project,
  task,
  ended,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onSchedule,
  onPomodoro,
}: {
  project: Project;
  task: Task;
  ended: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onSchedule: () => void;
  onPomodoro?: () => void;
}) {
  const { t } = useTranslation();
  const scheduled = task.subtasks.filter(
    (step) => step.startTime && step.endTime,
  ).length;
  const drag = useDraggable({
    id: "calendar-task-" + task.id,
    disabled: ended,
    data: {
      kind: "task",
      task,
      pid: project.id,
      label: task.name,
      weight: task.subtasks[0]?.weight ?? 1,
    } satisfies DragData,
  });
  return (
    <article
      ref={drag.setNodeRef}
      className={
        "calendar-task" +
        (selected ? " calendar-task-selected" : "") +
        (taskDone(task) ? " calendar-task-done" : "")
      }
      style={{ opacity: drag.isDragging ? 0.4 : undefined }}
      data-calendar-task-id={task.id}
    >
      <div className="calendar-task-main">
        <input
          type="checkbox"
          checked={taskDone(task)}
          disabled={ended}
          aria-label={task.name}
          onChange={onToggle}
        />
        <button
          className="calendar-task-name"
          aria-pressed={selected}
          title={t("selectForCalendar", { name: task.name })}
          onClick={onSelect}
        >
          {task.name}
        </button>
        <button
          className="calendar-small-button"
          aria-label={t("editTask", { name: task.name })}
          title={t("editTask", { name: task.name })}
          onClick={onEdit}
        >
          <Pencil size={14} />
        </button>
      </div>
      <div className="calendar-task-meta">
        <span title={project.name}>{project.name}</span>
        <span>
          {scheduled
            ? t("scheduledCount", { count: scheduled })
            : t("unscheduledTask")}
        </span>
      </div>
      <div className="calendar-task-actions">
        {onPomodoro ? (
          <button
            className="calendar-small-button calendar-pomodoro"
            aria-label={t("pomodoroNamedTask", { name: task.name })}
            title={t("pomodoroNamedTask", { name: task.name })}
            onClick={onPomodoro}
          >
            <Timer size={16} aria-hidden="true" />
          </button>
        ) : null}
        <button
          className="calendar-small-button calendar-task-drag"
          ref={drag.setActivatorNodeRef}
          disabled={ended}
          {...drag.attributes}
          {...drag.listeners}
          aria-label={t("dragTaskToCalendar", { name: task.name })}
          title={t("dragTaskToCalendar", { name: task.name })}
        >
          <GripVertical size={16} />
        </button>
        <button
          className="calendar-schedule-button"
          disabled={ended}
          aria-label={t("scheduleNamedTask", { name: task.name })}
          onClick={onSchedule}
        >
          <CalendarClock size={14} />
          {t("scheduleSession")}
        </button>
      </div>
    </article>
  );
}

function CalendarEvent({
  session,
  ended,
  onEdit,
}: {
  session: Session;
  ended: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { project, task, step, start, end, column, columns } = session;
  const drag = useDraggable({
    id: "calendar-session-" + step.id,
    disabled: ended,
    data: {
      kind: "session",
      task,
      pid: project.id,
      label: task.name,
      weight: step.weight,
      stepId: step.id,
      start,
      duration: end - start,
    } satisfies DragData,
  });
  const label = `${t("editNamedSession", { name: task.name })} · ${step.startTime}–${step.endTime}`;
  const style: CSSProperties = {
    top: start,
    height: Math.max(4, end - start - 2),
    left: `calc(${(column / columns) * 100}% + 3px)`,
    width: `calc(${100 / columns}% - 6px)`,
    opacity: drag.isDragging ? 0.35 : undefined,
  };
  return (
    <button
      ref={drag.setNodeRef}
      className={
        "calendar-event" +
        (step.done ? " calendar-event-done" : "") +
        (end - start < 35 ? " calendar-event-short" : "")
      }
      style={style}
      data-difficulty={step.weight}
      data-calendar-step-id={step.id}
      {...drag.attributes}
      {...drag.listeners}
      aria-label={label}
      title={`${task.name}\n${project.name}\n${step.startTime}–${step.endTime}${step.note ? "\n" + step.note : ""}`}
      onClick={onEdit}
    >
      <strong>{task.name}</strong>
      {end - start >= 35 ? (
        <span>
          {columns > 1 ? step.startTime : `${step.startTime}–${step.endTime}`}
        </span>
      ) : null}
      {end - start >= 75 ? <small>{step.note || project.name}</small> : null}
      {end - start >= 75 ? <DifficultyBadge value={step.weight} /> : null}
    </button>
  );
}

function CalendarDay({
  day,
  projects,
  ended,
  name,
  onSlot,
  onEditSession,
}: {
  day: number;
  projects: Project[];
  ended: boolean;
  name: string;
  onSlot: (day: number, minute: number) => void;
  onEditSession: (stepId: string) => void;
}) {
  const { t } = useTranslation();
  const drop = useDroppable({
    id: "calendar-day-" + day,
    disabled: ended,
    data: { day },
  });
  const sessions = useMemo(() => timedSessions(projects, day), [projects, day]);
  return (
    <div
      ref={drop.setNodeRef}
      className={
        "calendar-day-track" + (drop.isOver ? " calendar-day-over" : "")
      }
      data-calendar-day={day}
    >
      <button
        className="calendar-day-hit"
        aria-label={t("scheduleInDay", { day: name })}
        disabled={ended}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSlot(
            day,
            event.detail === 0
              ? DEFAULT_TIME
              : snapTime(event.clientY - rect.top),
          );
        }}
      />
      {sessions.map((session) => (
        <CalendarEvent
          key={session.step.id}
          session={session}
          ended={ended}
          onEdit={() => onEditSession(session.step.id)}
        />
      ))}
    </div>
  );
}

export function CalendarPlanner({
  start,
  projects,
  ended,
  todayDate,
  mobile,
  selectedDay,
  onSelectDay,
  onAddTask,
  onBulkAdd,
  onEditTask,
  onToggleTask,
  onSchedule,
  onChooseSlot,
  onEditSession,
  onReschedule,
  onPomodoro,
}: {
  start: string;
  projects: Project[];
  ended: boolean;
  todayDate: string;
  mobile: boolean;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onAddTask: () => void;
  onBulkAdd: (names: string[]) => void;
  onEditTask: (task: Task, pid: string) => void;
  onToggleTask: (taskId: string) => void;
  onSchedule: (
    task: Task,
    pid: string,
    day: number,
    startMinute: number,
  ) => void;
  onChooseSlot: (day: number, startMinute: number) => void;
  onEditSession: (stepId: string) => void;
  onReschedule: (stepId: string, day: number, startMinute: number) => void;
  onPomodoro?: (task: Task, pid: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [tasksOpen, setTasksOpen] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragged, setDragged] = useState<DragData | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLElement>(null);
  const dragPosition = useRef({ initialY: 0, grabOffset: 0 });
  const names = t("dayNames").split(",");
  const shortNames = t("mobileShort").split(",");
  const days = mobile ? [selectedDay] : DAYS;
  const tasks = useMemo(
    () =>
      projects.flatMap((project) =>
        project.tasks.map((task) => ({ project, task })),
      ),
    [projects],
  );
  const selectedTask = tasks.find(({ task }) => task.id === selectedTaskId);
  const query = search.trim().toLocaleLowerCase();
  const shownTasks = query
    ? tasks.filter(({ project, task }) =>
        (task.name + " " + project.name).toLocaleLowerCase().includes(query),
      )
    : tasks;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * 60;
  }, [start, mobile]);
  useEffect(() => {
    if (!mobile || tasksOpen) return;
    const frame = requestAnimationFrame(() =>
      timeline.current?.scrollIntoView({ block: "start", behavior: "auto" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [mobile, tasksOpen]);

  const submitQuickTask = (event: FormEvent) => {
    event.preventDefault();
    if (!quickName.trim()) return;
    onBulkAdd([quickName.trim()]);
    setQuickName("");
  };
  const submitBulkTasks = (event: FormEvent) => {
    event.preventDefault();
    const taskNames = bulkText
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (!taskNames.length) return;
    onBulkAdd(taskNames);
    setBulkText("");
    setBulkOpen(false);
  };
  const chooseSlot = (day: number, minute: number) => {
    if (selectedTask)
      onSchedule(selectedTask.task, selectedTask.project.id, day, minute);
    else onChooseSlot(day, minute);
  };
  const startDrag = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    const source =
      event.activatorEvent.target instanceof Element
        ? event.activatorEvent.target.closest<HTMLElement>(
            "[data-calendar-step-id]",
          )
        : null;
    const sourceTop =
      source?.getBoundingClientRect().top ??
      event.active.rect.current.initial?.top;
    const initialY = pointerY(event.activatorEvent) ?? sourceTop ?? 0;
    dragPosition.current = {
      initialY,
      grabOffset:
        data.kind === "session" ? initialY - (sourceTop ?? initialY) : 0,
    };
    setDragged(data);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={calendarCollision}
      accessibility={{
        screenReaderInstructions: { draggable: t("calendarDragInstructions") },
        announcements: {
          onDragStart: ({ active }) =>
            t("dragPicked", { name: active.data.current?.label }),
          onDragOver: ({ over }) =>
            over ? t("dragOver", { name: names[over.data.current?.day] }) : "",
          onDragEnd: ({ over }) =>
            over
              ? t("dragDropped", { name: names[over.data.current?.day] })
              : t("dragCanceled"),
          onDragCancel: () => t("dragCanceled"),
        },
      }}
      onDragStart={startDrag}
      onDragCancel={() => setDragged(null)}
      onDragEnd={({ active, over, delta }) => {
        setDragged(null);
        if (!over || ended) return;
        const data = active.data.current as DragData;
        const minute = snapTime(
          dragPosition.current.initialY +
            delta.y -
            over.rect.top -
            dragPosition.current.grabOffset,
        );
        const day = Number(over.data.current?.day);
        if (data.kind === "task") onSchedule(data.task, data.pid, day, minute);
        else if (data.stepId) onReschedule(data.stepId, day, minute);
      }}
    >
      <div className="calendar-planner">
        <aside
          role="region"
          className={
            "calendar-task-pane" +
            (mobile && !tasksOpen ? " calendar-task-pane-collapsed" : "")
          }
          aria-label={t("taskList")}
        >
          <div className="calendar-task-pane-heading">
            <div>
              <h2>{t("taskList")}</h2>
              <span>{t("calendarTaskCount", { count: tasks.length })}</span>
            </div>
            {mobile ? (
              <button
                className="calendar-small-button"
                aria-label={t(tasksOpen ? "hideTaskList" : "showTaskList")}
                aria-expanded={tasksOpen}
                aria-controls="calendar-task-pane-content"
                onClick={() => setTasksOpen(!tasksOpen)}
              >
                {tasksOpen ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
            ) : null}
          </div>
          <div
            className="calendar-task-pane-content"
            id="calendar-task-pane-content"
            hidden={mobile && !tasksOpen}
          >
            <p className="calendar-pane-hint">{t("calendarHint")}</p>
            {!ended ? (
              <>
                <form className="calendar-quick-add" onSubmit={submitQuickTask}>
                  <input
                    aria-label={t("quickTaskName")}
                    placeholder={t("quickTaskName")}
                    maxLength={500}
                    value={quickName}
                    onChange={(event) => setQuickName(event.target.value)}
                  />
                  <button
                    className="calendar-small-button"
                    type="submit"
                    disabled={!quickName.trim()}
                    aria-label={t("addQuickTask")}
                  >
                    <Plus size={18} />
                  </button>
                </form>
                <button
                  className="calendar-bulk-button"
                  aria-expanded={bulkOpen}
                  aria-controls="calendar-bulk-form"
                  onClick={() => setBulkOpen(!bulkOpen)}
                >
                  <ListPlus size={17} />
                  {t("bulkTasks")}
                </button>
                {bulkOpen ? (
                  <form
                    className="calendar-bulk-form"
                    id="calendar-bulk-form"
                    onSubmit={submitBulkTasks}
                  >
                    <label>
                      {t("taskNames")}
                      <textarea
                        autoFocus
                        rows={4}
                        maxLength={100000}
                        placeholder={t("taskNamesHint")}
                        value={bulkText}
                        onChange={(event) => setBulkText(event.target.value)}
                      />
                    </label>
                    <button
                      className="secondary compact"
                      type="submit"
                      disabled={!bulkText.trim()}
                    >
                      {t("addTasks")}
                    </button>
                  </form>
                ) : null}
              </>
            ) : null}
            {tasks.length ? (
              <label className="calendar-search">
                <Search size={15} />
                <input
                  aria-label={t("searchTasks")}
                  placeholder={t("searchTasks")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            ) : null}
            <div className="calendar-task-list">
              {shownTasks.map(({ project, task }) => (
                <CalendarTask
                  key={task.id}
                  project={project}
                  task={task}
                  ended={ended}
                  selected={selectedTaskId === task.id}
                  onSelect={() =>
                    setSelectedTaskId(
                      selectedTaskId === task.id ? null : task.id,
                    )
                  }
                  onEdit={() => onEditTask(task, project.id)}
                  onToggle={() => onToggleTask(task.id)}
                  onPomodoro={
                    onPomodoro ? () => onPomodoro(task, project.id) : undefined
                  }
                  onSchedule={() =>
                    onSchedule(task, project.id, selectedDay, DEFAULT_TIME)
                  }
                />
              ))}
              {!shownTasks.length ? (
                <div className="calendar-empty-tasks">
                  <p>{t(tasks.length ? "noMatchingTasks" : "emptyTaskList")}</p>
                  {!tasks.length && !ended ? (
                    <button className="text-button" onClick={onAddTask}>
                      <Plus size={16} />
                      {t("newTask")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
        <section
          ref={timeline}
          className="calendar-timeline"
          aria-label={t("calendarWeekLabel")}
        >
          <div className="calendar-timeline-toolbar">
            <span className="calendar-selection-hint">
              {selectedTask
                ? t("selectedForCalendar", { name: selectedTask.task.name })
                : t("calendarEmptyHint")}
            </span>
            <span className="calendar-timezone">{t("timeZoneLabel")}</span>
          </div>
          {mobile ? (
            <div className="calendar-day-tabs" aria-label={t("allDays")}>
              {DAYS.map((day) => (
                <button
                  key={day}
                  aria-label={t("focusDay", { day: names[day] })}
                  aria-pressed={selectedDay === day}
                  className={selectedDay === day ? "calendar-day-selected" : ""}
                  onClick={() => onSelectDay(day)}
                >
                  <span>{shortNames[day]}</span>
                  <strong>{Number(shiftDate(start, day).slice(8))}</strong>
                </button>
              ))}
            </div>
          ) : null}
          <div className="calendar-scroll" ref={scroller}>
            <div
              className="calendar-time-grid"
              style={{ "--calendar-days": days.length } as CSSProperties}
            >
              <div className="calendar-sticky-header">
                <div className="calendar-header-gutter">
                  <CalendarClock size={17} />
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className={
                      "calendar-date-heading" +
                      (shiftDate(start, day) === todayDate
                        ? " calendar-date-today"
                        : "")
                    }
                  >
                    <span>{mobile ? names[day] : shortNames[day]}</span>
                    <strong>{Number(shiftDate(start, day).slice(8))}</strong>
                  </div>
                ))}
                <div
                  className="calendar-untimed-row"
                  role="region"
                  aria-label={t("untimed")}
                >
                  <div className="calendar-untimed-gutter">
                    {t("untimedShort")}
                  </div>
                  {days.map((day) => (
                    <div key={day} className="calendar-untimed-day">
                      {projects.flatMap((project) =>
                        project.tasks.flatMap((task) =>
                          task.subtasks
                            .filter(
                              (step) =>
                                step.day === day &&
                                !(step.startTime && step.endTime),
                            )
                            .map((step) => (
                              <button
                                key={step.id}
                                className="calendar-untimed-event"
                                data-difficulty={step.weight}
                                data-calendar-step-id={step.id}
                                aria-label={t("untimedNamedSession", {
                                  name: task.name,
                                })}
                                title={
                                  task.name +
                                  (step.note ? "\n" + step.note : "")
                                }
                                onClick={() => onEditSession(step.id)}
                              >
                                <span>{task.name}</span>
                                <DifficultyBadge value={step.weight} />
                              </button>
                            )),
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="calendar-hour-gutter" aria-hidden="true">
                {HOURS.map((hour) => (
                  <span key={hour} style={{ top: hour * 60 }}>
                    {minutesToTime(hour * 60)}
                  </span>
                ))}
                <span
                  className="calendar-last-hour"
                  style={{ top: MINUTES_PER_DAY }}
                >
                  24:00
                </span>
              </div>
              {days.map((day) => (
                <CalendarDay
                  key={day}
                  day={day}
                  name={names[day]}
                  projects={projects}
                  ended={ended}
                  onSlot={chooseSlot}
                  onEditSession={onEditSession}
                />
              ))}
            </div>
          </div>
          <div className="calendar-footer">
            <span>{t("calendarDragHint")}</span>
            <div className="calendar-difficulty-key">
              <DifficultyBadge value={1} />
              <DifficultyBadge value={2} />
              <DifficultyBadge value={3} />
            </div>
          </div>
        </section>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragged ? (
          <div
            className="calendar-drag-preview"
            data-difficulty={dragged.weight}
          >
            <CalendarClock size={15} />
            <strong>{dragged.label}</strong>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
