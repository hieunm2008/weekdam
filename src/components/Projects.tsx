import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil } from "lucide-react";
import { id, progress, taskDone, type Project, type Task } from "../domain";
import { Modal } from "./Modal";
import { useDndAccessibility } from "./dndAccessibility";

const managerCollision:CollisionDetection=args=>closestCenter({...args,droppableContainers:args.droppableContainers.filter(container=>container.data.current?.kind===args.active.data.current?.kind&&container.data.current?.parent===args.active.data.current?.parent)});
const managerKeyboard:KeyboardCoordinateGetter=(event,args)=>{
  if(!['ArrowUp','ArrowDown'].includes(event.code))return;
  const active=args.context.active;if(!active)return;
  const items=args.context.droppableContainers.getEnabled().filter(container=>container.data.current?.kind===active.data.current?.kind&&container.data.current?.parent===active.data.current?.parent).sort((a,b)=>(args.context.droppableRects.get(a.id)?.top??0)-(args.context.droppableRects.get(b.id)?.top??0));
  const overIndex=items.findIndex(item=>item.id===(args.context.over?.id??active.id));const index=Math.max(0,Math.min(items.length-1,Math.max(0,overIndex)+(event.code==='ArrowDown'?1:-1)));const rect=args.context.droppableRects.get(items[index]?.id);
  if(rect){event.preventDefault();return {x:rect.left,y:rect.top};}
};

export function ProjectEditor({
  project,
  onSave,
  onDelete,
  onClose,
}: {
  project?: Project;
  onSave: (p: Project) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    [name, setName] = useState(project?.name ?? ""),
    [date, setDate] = useState(project?.deadline?.slice(0, 10) ?? ""),
    [time, setTime] = useState(project?.deadline?.slice(11) ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim())
      onSave({
        id: project?.id ?? id(),
        name: name.trim(),
        tasks: project?.tasks ?? [],
        ...(date ? { deadline: date + (time ? "T" + time : "") } : {}),
      });
  };
  return (
    <Modal
      title={
        project ? t("editProject", { name: project.name }) : t("newProject")
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label>
          {t("projectName")}
          <input
            autoFocus
            required
            maxLength={300}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t("deadline")}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          {t("time")}
          <input
            type="time"
            value={time}
            disabled={!date}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <footer className="dialog-actions">
          {onDelete ? (
            <button
              type="button"
              className="text-button danger"
              onClick={onDelete}
            >
              {t("deleteProject")}
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
function TaskRow({
  task,
  pid,
  onEdit,
  onToggle,
  ended,
}: {
  task: Task;
  pid: string;
  onEdit: () => void;
  onToggle: () => void;
  ended: boolean;
}) {
  const { t } = useTranslation(),
    drag = useSortable({
      id: task.id,
      disabled: ended,
      data: { kind: "task", parent: pid, label: task.name },
    }),
    count = progress([{ id: pid, name: "", tasks: [task] }]);
  return (
    <div
      className="manager-task"
      ref={drag.setNodeRef}
      style={{
        transform: CSS.Transform.toString(drag.transform),
        transition: drag.transition,
      }}
    >
      <button
        className="drag-handle"
        disabled={ended}
        aria-label={t("dragTask")}
        {...drag.attributes}
        {...drag.listeners}
      >
        <GripVertical size={16} />
      </button>
      <label className="check-target">
        <input
          type="checkbox"
          aria-label={task.name}
          checked={taskDone(task)}
          disabled={ended}
          onChange={onToggle}
        />
      </label>
      <button className="manager-task-name" onClick={onEdit}>
        {task.name}
      </button>
      <span className="muted">
        {count.done}/{count.total}
      </span>
      <button
        className="icon-button"
        aria-label={t("editTask", { name: task.name })}
        onClick={onEdit}
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}
function ProjectBlock({
  project,
  ended,
  onEdit,
  onAdd,
  onTask,
  onToggle,
}: {
  project: Project;
  ended: boolean;
  onEdit: () => void;
  onAdd: () => void;
  onTask: (t: Task) => void;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation(),
    drag = useSortable({
      id: project.id,
      disabled: ended,
      data: { kind: "project", label: project.name },
    }),
    count = progress([project]);
  return (
    <section
      className="manager-project"
      ref={drag.setNodeRef}
      style={{
        transform: CSS.Transform.toString(drag.transform),
        transition: drag.transition,
      }}
    >
      <header>
        <button
          className="drag-handle"
          disabled={ended}
          aria-label={t("dragProject")}
          {...drag.attributes}
          {...drag.listeners}
        >
          <GripVertical size={18} />
        </button>
        <button className="project-title" onClick={onEdit}>
          {project.name}
        </button>
        <span className="muted">{count.percent}%</span>
      </header>
      {project.deadline ? (
        <p className="manager-deadline">
          {t("deadline")}: {project.deadline.replace("T", " · ")}
        </p>
      ) : null}
      <SortableContext
        items={project.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {project.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            pid={project.id}
            ended={ended}
            onEdit={() => onTask(task)}
            onToggle={() => onToggle(task.id)}
          />
        ))}
      </SortableContext>
      {!ended ? (
        <button className="text-button" onClick={onAdd}>
          <Plus size={16} />
          {t("newTask")}
        </button>
      ) : null}
    </section>
  );
}
export function ProjectsManager({
  projects,
  ended,
  onEdit,
  onAdd,
  onTask,
  onToggle,
  onReorder,
  onClose,
  onCreate,
}: {
  projects: Project[];
  ended: boolean;
  onEdit: (p: Project) => void;
  onAdd: (pid: string) => void;
  onTask: (task: Task, pid: string) => void;
  onToggle: (id: string) => void;
  onReorder: (
    id: string,
    target: string,
    kind: string,
    parent?: string,
  ) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation(),
    sensors = useSensors(
      useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 8 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: managerKeyboard,
      }),
    );
  const accessibility = useDndAccessibility();
  return (
    <Modal title={t("projects")} onClose={onClose} wide>
      {!ended ? (
        <div className="manager-toolbar">
          <button className="primary" onClick={onCreate}>
            <Plus size={17} />
            {t("newProject")}
          </button>
        </div>
      ) : null}
      <DndContext
        accessibility={accessibility}
        sensors={sensors}
        collisionDetection={managerCollision}
        onDragEnd={({ active, over }) => {
          if (
            over &&
            active.id !== over.id &&
            active.data.current?.kind === over.data.current?.kind &&
            active.data.current?.parent === over.data.current?.parent
          )
            onReorder(
              String(active.id),
              String(over.id),
              String(active.data.current?.kind),
              active.data.current?.parent,
            );
        }}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <ProjectBlock
              key={project.id}
              project={project}
              ended={ended}
              onEdit={() => onEdit(project)}
              onAdd={() => onAdd(project.id)}
              onTask={(task) => onTask(task, project.id)}
              onToggle={onToggle}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Modal>
  );
}
