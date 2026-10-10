import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChartNoAxesColumn,
  Archive,
  Folder,
  Settings,
  Plus,
  X,
  ArrowRight,
  Check,
  CloudOff,
} from "lucide-react";
import type { Project } from "../domain";

export function Navigation({
  route,
  projects,
  filter,
  online,
  status,
  onRoute,
  onFilter,
  onCreate,
  onManage,
  onSettings,
}: {
  route: string;
  projects: Project[];
  filter: string;
  online: boolean;
  status: string;
  onRoute: (route: string) => void;
  onFilter: (id: string) => void;
  onCreate: () => void;
  onManage: () => void;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    first = useRef<HTMLButtonElement>(null);
  const openingInput = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const outside = (event: PointerEvent) => {
      const node = event.target as Node;
      if (
        !panel.current?.contains(node) &&
        !trigger.current?.contains(node) &&
        !document.querySelector("dialog[open]")
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const select = (id: string, keyboard: boolean) => {
    onFilter(id);
    setOpen(false);
    if (keyboard) trigger.current?.focus();
  };
  return (
    <>
      <aside className="sidebar" aria-label={t("workspace")}>
        <a
          className="brand"
          href="#"
          aria-label="weekdam"
          onClick={(event) => {
            event.preventDefault();
            onRoute("plan");
            setOpen(false);
          }}
        >
          <img src="/icon.svg" width={32} height={32} alt="" />
        </a>
        <nav className="desktop-nav" aria-label={t("plan")}>
          {[
            { key: "plan", icon: CalendarDays },
            { key: "stats", icon: ChartNoAxesColumn },
            { key: "weeks", icon: Archive },
          ].map(({ key, icon: Icon }) => (
            <button
              key={key}
              aria-label={t(key)}
              aria-current={route === key ? "page" : undefined}
              data-tooltip={t(key)}
              className={route === key ? "active" : ""}
              onClick={() => {
                onRoute(key);
                setOpen(false);
              }}
            >
              <Icon size={21} />
            </button>
          ))}
          <button
            ref={trigger}
            className={open ? "active" : ""}
            aria-label={t("projectFilter")}
            data-tooltip={t("projectFilter")}
            aria-expanded={open}
            aria-controls="project-panel"
            onClick={() => {
              openingInput.current =
                document.documentElement.dataset.inputMethod;
              setOpen((value) => !value);
            }}
          >
            <Folder size={21} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span
            className="rail-status"
            data-tooltip={t(status)}
            aria-hidden="true"
          >
            {online ? <Check size={16} /> : <CloudOff size={16} />}
          </span>
          <button
            className="settings-button"
            aria-label={t("settings")}
            data-tooltip={t("settings")}
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
          >
            <Settings size={22} />
          </button>
        </div>
      </aside>
      {open ? (
        <section
          ref={panel}
          id="project-panel"
          data-input-method={openingInput.current}
          className="project-panel"
          aria-label={t("projects")}
        >
          <header>
            <h2>{t("projects")}</h2>
            <button
              className="icon-button"
              aria-label={t("closeProjects")}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={19} />
            </button>
          </header>
          <div className="sidebar-projects">
            <button
              ref={first}
              className={!filter ? "project-filter selected" : "project-filter"}
              aria-pressed={!filter}
              onClick={(event) => select("", event.detail === 0)}
            >
              <Folder size={17} />
              {t("allProjects")}
            </button>
            {projects.map((project, index) => (
              <button
                key={project.id}
                className={
                  filter === project.id
                    ? "project-filter selected"
                    : "project-filter"
                }
                aria-pressed={filter === project.id}
                onClick={(event) => select(project.id, event.detail === 0)}
              >
                <i className={"project-dot color-" + (index % 4)} />
                <span>{project.name}</span>
                <small>{project.tasks.length}</small>
              </button>
            ))}
          </div>
          <footer>
            <button className="text-button" onClick={onCreate}>
              <Plus size={17} />
              {t("newProject")}
            </button>
            <button className="text-button" onClick={onManage}>
              {t("projects")}
              <ArrowRight size={16} />
            </button>
          </footer>
        </section>
      ) : null}
    </>
  );
}
