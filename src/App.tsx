import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { arrayMove } from "@dnd-kit/sortable";
import { getISOWeek, parseISO } from "date-fns";
import {
  CalendarDays,
  ChartNoAxesColumn,
  Archive,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Folder,
  Check,
  CloudOff,
  Copy,
  ClipboardPaste,
  ArrowRight,
  Download,
  Undo2,
} from "lucide-react";
import {
  blankTask,
  clone,
  copyProjects,
  daysLeft,
  endWeek,
  id,
  mergePlans,
  moveWeek,
  parseBackup,
  progress,
  replaceWeek,
  shiftDate,
  taskDone,
  today,
  weekAt,
  weekStart,
  type Project,
  type Task,
  type Week,
} from "./domain";
import { usePlanner } from "./usePlanner";
import { Modal } from "./components/Modal";
import { ProjectEditor, ProjectsManager } from "./components/Projects";
import { TaskEditor } from "./components/TaskEditor";
import { Board } from "./components/Board";
import i18n from "./i18n";
const Stats = lazy(() => import("./components/Stats"));
type Dialog = {
  kind: string;
  project?: Project;
  task?: Task;
  pid?: string;
  stepId?: string;
  source?: Week;
};
type InstallEvent = Event & { prompt: () => Promise<void> };
const formatDay = (day: string, lang: string) =>
  new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
const range = (start: string, lang: string) =>
  formatDay(start, lang) + " – " + formatDay(shiftDate(start, 6), lang);

function CopyDialog({
  source,
  onClose,
  onCopy,
}: {
  source: Week;
  onClose: () => void;
  onCopy: (projects: Project[]) => Promise<void>;
}) {
  const { t } = useTranslation(),
    [selected, setSelected] = useState(source.projects.map((p) => p.id)),
    [fallback, setFallback] = useState("");
  return (
    <Modal title={t("copy")} onClose={onClose}>
      <p className="muted">{t("selectProjects")}</p>
      <div className="copy-projects">
        {source.projects.map((p) => (
          <label className="check-label" key={p.id}>
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, p.id]
                    : selected.filter((key) => key !== p.id),
                )
              }
            />
            <span>
              {p.name}
              <small>
                {p.tasks.length} {t("units")}
              </small>
            </span>
          </label>
        ))}
      </div>
      {fallback ? (
        <label>
          {t("clipboardFallback")}
          <textarea
            readOnly
            rows={8}
            aria-label={t("copyText")}
            value={fallback}
            onFocus={(e) => e.target.select()}
          />
        </label>
      ) : null}
      <footer className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          {t("cancel")}
        </button>
        <button
          className="primary"
          disabled={!selected.length}
          onClick={() => {
            const chosen = source.projects.filter((p) =>
              selected.includes(p.id),
            );
            void onCopy(chosen).catch(() =>
              setFallback(
                JSON.stringify(
                  {
                    format: "weekdam.plan.v1",
                    sourceWeek: source.start,
                    projects: chosen,
                  },
                  null,
                  2,
                ),
              ),
            );
          }}
        >
          {t("copyAction")}
        </button>
      </footer>
    </Modal>
  );
}
function PasteDialog({
  start,
  onClose,
  onPaste,
  error,
}: {
  start: string;
  onClose: () => void;
  onPaste: (text: string, keep: boolean) => void;
  error?: string;
}) {
  const { t } = useTranslation(),
    [text, setText] = useState(""),
    [keep, setKeep] = useState(false);
  let old = false;
  try {
    const data = JSON.parse(text);
    old =
      Array.isArray(data.projects) &&
      data.projects.some(
        (p: Project) =>
          (p.deadline && p.deadline.slice(0, 10) < start) ||
          p.tasks?.some(
            (task) => task.deadline && task.deadline.slice(0, 10) < start,
          ),
      );
  } catch {}
  return (
    <Modal title={t("paste")} onClose={onClose} error={error}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPaste(text, keep);
        }}
      >
        <p className="muted">{t("pasteHint")}</p>
        <label>
          {t("copyText")}
          <textarea
            autoFocus
            rows={8}
            maxLength={5_000_000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
          />
          {t("keepProgress")}
        </label>
        {old ? <p className="warning">{t("oldDeadlines")}</p> : null}
        <footer className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="primary" disabled={!text.trim()}>
            {t("pasteAction")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function App() {
  const { t } = useTranslation(),
    store = usePlanner();
  const [route, setRoute] = useState("plan"),
    [start, setStart] = useState(
      () => localStorage.getItem("weekdam:viewed-week") ?? weekStart(today()),
    );
  const [date, setDate] = useState(today),
    [selectedDay, setSelectedDay] = useState(() =>
      Math.max(
        0,
        Math.min(
          6,
          Math.round(
            (Date.parse(today()) - Date.parse(weekStart(today()))) / 86400000,
          ),
        ),
      ),
    );
  const [mobile, setMobile] = useState(
      () => matchMedia("(max-width: 899px)").matches,
    ),
    [focus, setFocus] = useState<number | null>(null),
    [filter, setFilter] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null),
    [theme, setTheme] = useState(
      () => localStorage.getItem("weekdam:theme") ?? "system",
    ),
    [guide, setGuide] = useState(
      () => localStorage.getItem("weekdam:guide") !== "no",
    );
  const [target, setTarget] = useState(""),
    [moveDay, setMoveDay] = useState(0),
    [markMissed, setMarkMissed] = useState(false),
    [backupText, setBackupText] = useState("");
  const [install, setInstall] = useState<InstallEvent | null>(null),
    {
      needRefresh: [needRefresh],
      updateServiceWorker,
    } = useRegisterSW();
  const week = useMemo(() => weekAt(store.plan, start), [store.plan, start]),
    count = progress(week.projects),
    activeFilter = week.projects.some((p) => p.id === filter) ? filter : "",
    shown = activeFilter
      ? week.projects.filter((p) => p.id === activeFilter)
      : week.projects;
  const currentStart = weekStart(date),
    remaining = daysLeft(start, date),
    dayNames = t("dayNames").split(","),
    shortNames = t("mobileShort").split(",");
  useEffect(() => {
    const timer = setInterval(() => setDate(today()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const query = matchMedia("(max-width: 899px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    localStorage.setItem("weekdam:viewed-week", start);
  }, [start]);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
      document.documentElement.lang = i18n.language;
    };
    apply();
    query.addEventListener("change", apply);
    localStorage.setItem("weekdam:theme", theme);
    return () => query.removeEventListener("change", apply);
  }, [theme, t]);
  useEffect(() => {
    const event = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", event);
    return () => window.removeEventListener("beforeinstallprompt", event);
  }, []);
  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      const editing = (e.target as HTMLElement)?.closest(
        "input,textarea,select,[contenteditable]",
      );
      if (
        editing ||
        dialog ||
        e.defaultPrevented ||
        (e.target as HTMLElement)?.closest("[aria-roledescription]")
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        store.undo();
      } else if (e.key === "n") {
        e.preventDefault();
        newTask();
      } else if (e.key === "t") {
        setStart(weekStart(today()));
      } else if (e.key === "ArrowLeft") {
        setStart((s) => shiftDate(s, -7));
      } else if (e.key === "ArrowRight") {
        setStart((s) => shiftDate(s, 7));
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  });
  useEffect(() => {
    setDialog(null);
    setFilter("");
  }, [store.scope]);
  const close = () => setDialog(null),
    navigate = (value: string) => {
      setStart(value);
      setRoute("plan");
      setFilter("");
    };
  function mutate(fn: (next: Week) => void, label = "updated") {
    const next = clone(week);
    fn(next);
    store.commit(replaceWeek(store.plan, next), label);
  }
  function newTask(
    day = selectedDay,
    pid = activeFilter || week.projects[0]?.id,
  ) {
    if (week.ended) {
      setDialog({ kind: "reopen" });
      return;
    }
    if (!pid) {
      setDialog({ kind: "project" });
      return;
    }
    setDialog({ kind: "task", task: blankTask(day), pid });
  }
  function editTask(task: Task, pid: string) {
    if (week.ended) {
      setDialog({ kind: "reopen" });
      return;
    }
    setDialog({ kind: "task", task, pid });
  }
  function toggleTask(tid: string) {
    mutate((w) => {
      for (const p of w.projects) {
        const task = p.tasks.find((t) => t.id === tid);
        if (task) {
          const done = !taskDone(task);
          task.done = done;
          task.subtasks.forEach((s) => (s.done = done));
        }
      }
    });
  }
  function moveStep(sid: string, day: number, before?: string, missed = false) {
    mutate((w) => {
      for (const p of w.projects)
        for (const task of p.tasks) {
          const index = task.subtasks.findIndex((s) => s.id === sid);
          if (index < 0) continue;
          const step = task.subtasks[index];
          if (missed && step.day !== day && !step.missed.includes(step.day))
            step.missed.push(step.day);
          step.day = day;
          step.missed = step.missed.filter((d) => d !== day);
          if (before && before !== sid) {
            const destination = task.subtasks.findIndex((s) => s.id === before);
            if (destination >= 0)
              task.subtasks = arrayMove(task.subtasks, index, destination);
          }
        }
    });
  }
  function openMove(sid: string) {
    const step = week.projects
      .flatMap((p) => p.tasks.flatMap((t) => t.subtasks))
      .find((s) => s.id === sid);
    if (step) {
      setMoveDay(step.day);
      setMarkMissed(shiftDate(start, step.day) < date && !step.done);
      setDialog({ kind: "move-day", stepId: sid });
    }
  }
  function saveTask(task: Task, pid: string) {
    mutate((w) => {
      const target = w.projects.find((p) => p.id === pid);
      if (!target) return;
      const index = target.tasks.findIndex((old) => old.id === task.id);
      if (index >= 0) target.tasks[index] = task;
      else {
        w.projects.forEach(
          (p) => (p.tasks = p.tasks.filter((old) => old.id !== task.id)),
        );
        target.tasks.push(task);
      }
    });
    close();
  }
  function exportBackup() {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(store.plan, null, 2)], {
          type: "application/json",
        }),
      ),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "weekdam-" + today() + ".json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function paste(text: string, keep: boolean) {
    try {
      const payload = JSON.parse(text);
      if (
        payload.format !== "weekdam.plan.v1" ||
        !Array.isArray(payload.projects)
      )
        throw new Error();
      const parsed = parseBackup(
        JSON.stringify({
          version: 1,
          weeks: [
            {
              id: id(),
              start: payload.sourceWeek,
              ended: false,
              projects: payload.projects,
            },
          ],
        }),
      );
      mutate((w) =>
        w.projects.push(...copyProjects(parsed.weeks[0].projects, keep)),
      );
      close();
    } catch {
      store.setError("invalid");
    }
  }
  const nav = [
    { key: "plan", icon: CalendarDays },
    { key: "stats", icon: ChartNoAxesColumn },
    { key: "weeks", icon: Archive },
  ];
  if (!store.ready && !store.mergeRequest)
    return (
      <div className="loading-screen">
        <img src="/icon.svg" width={48} height={48} alt="" />
        <p>{t("loading")}</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setRoute("plan");
          }}
        >
          <img src="/icon.svg" width={34} height={34} alt="" />
          weekdam<span>{t("workspace")}</span>
        </a>
        <nav className="desktop-nav" aria-label={t("plan")}>
          {nav.map(({ key, icon: Icon }) => (
            <button
              key={key}
              className={route === key ? "active" : ""}
              onClick={() => setRoute(key)}
            >
              <Icon size={19} />
              {t(key)}
            </button>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="sidebar-heading">
            <span>{t("projects")}</span>
            <button
              className="icon-button"
              aria-label={t("newProject")}
              onClick={() => setDialog({ kind: "project" })}
            >
              <Plus size={17} />
            </button>
          </div>
          <button
            className={!filter ? "project-filter selected" : "project-filter"}
            onClick={() => setFilter("")}
          >
            <Folder size={16} />
            {t("allProjects")}
          </button>
          {week.projects.map((p, i) => (
            <button
              key={p.id}
              className={
                filter === p.id ? "project-filter selected" : "project-filter"
              }
              onClick={() => {
                setFilter(p.id);
                setRoute("plan");
              }}
            >
              <i className={"project-dot color-" + (i % 4)} />
              <span>{p.name}</span>
              <small>{p.tasks.length}</small>
            </button>
          ))}
          {week.projects.length ? (
            <button
              className="text-button"
              onClick={() => setDialog({ kind: "projects" })}
            >
              {t("projects")}
              <ArrowRight size={15} />
            </button>
          ) : null}
        </div>
        <div className="sidebar-bottom">
          <div className="sync-label">
            {store.online ? <Check size={15} /> : <CloudOff size={15} />}
            <span>{t(store.status)}</span>
          </div>
          <button
            className="settings-button"
            aria-label={t("settings")}
            onClick={() => setDialog({ kind: "settings" })}
          >
            <Settings size={19} />
            {t("settings")}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div>
            <span
              className="mobile-sync"
              data-testid="sync-status"
              aria-live="polite"
            >
              {t(store.status)}
            </span>
            <p className="eyebrow">
              {route === "plan"
                ? t(start === currentStart ? "thisWeek" : "week") +
                  " " +
                  getISOWeek(parseISO(start))
                : t("welcome")}
            </p>
            <h1>{route === "plan" ? range(start, i18n.language) : t(route)}</h1>
          </div>
          <div className="header-actions">
            {install ? (
              <button
                className="secondary"
                onClick={() => {
                  void install.prompt();
                  setInstall(null);
                }}
              >
                <Download size={17} />
                {t("install")}
              </button>
            ) : null}
            <button
              className="icon-button mobile-settings"
              aria-label={t("settings")}
              onClick={() => setDialog({ kind: "settings" })}
            >
              <Settings size={20} />
            </button>
            {route === "plan" ? (
              <button
                className="primary new-task-button"
                onClick={() => newTask()}
              >
                <Plus size={18} />
                {t("newTask")}
              </button>
            ) : null}
          </div>
        </header>
        {store.error ? (
          <div className="alert" role="alert">
            {t(store.error)}
            <button className="text-button" onClick={() => store.setError("")}>
              {t("close")}
            </button>
          </div>
        ) : null}
        {route === "plan" ? (
          <>
            <div className="week-toolbar">
              <div className="week-navigation">
                <button
                  className="icon-button"
                  aria-label={t("previous")}
                  onClick={() => navigate(shiftDate(start, -7))}
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  className="secondary compact"
                  onClick={() => navigate(currentStart)}
                >
                  {t("today")}
                </button>
                <button
                  className="icon-button"
                  aria-label={t("next")}
                  onClick={() => navigate(shiftDate(start, 7))}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
              <div className="toolbar-actions">
                <button
                  className="secondary compact"
                  onClick={() => setDialog({ kind: "projects" })}
                >
                  <Folder size={16} />
                  {t("projects")}
                </button>
                <button
                  className="icon-button"
                  aria-label={t("manage")}
                  onClick={() => setDialog({ kind: "manage" })}
                >
                  <MoreHorizontal size={22} />
                </button>
              </div>
            </div>
            <div className="progress-row">
              <div className="progress-track">
                <i style={{ width: count.percent + "%" }} />
              </div>
              <span data-testid="week-progress">
                <strong>{count.percent}%</strong>
                <small>
                  {count.done}/{count.total} {t("units")}
                </small>
              </span>
            </div>
            <div className="week-meta">
              <span>
                {week.ended
                  ? t("ended")
                  : remaining
                    ? t("daysLeft", { count: remaining })
                    : t("endWeek")}
              </span>
              <div>
                {!week.ended && week.projects.length ? (
                  <button
                    className="text-button"
                    onClick={() => setDialog({ kind: "copy" })}
                  >
                    <Copy size={15} />
                    {t("copy")}
                  </button>
                ) : null}
                {!week.ended ? (
                  <button
                    className="text-button"
                    onClick={() => setDialog({ kind: "paste" })}
                  >
                    <ClipboardPaste size={15} />
                    {t("paste")}
                  </button>
                ) : null}
              </div>
            </div>
            {!week.projects.length ? (
              <div className="onboarding">
                <div className="onboarding-mark">
                  <CalendarDays size={29} />
                </div>
                <h2>{t(guide ? "guideTitle" : "emptyWeek")}</h2>
                <p>{t("guideText")}</p>
                {guide ? (
                  <ol>
                    <li>{t("guideStep1")}</li>
                    <li>{t("guideStep2")}</li>
                    <li>{t("guideStep3")}</li>
                  </ol>
                ) : null}
                <button
                  className="primary"
                  onClick={() => setDialog({ kind: "project" })}
                >
                  <Plus size={17} />
                  {t("newProject")}
                </button>
                {guide ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      setGuide(false);
                      localStorage.setItem("weekdam:guide", "no");
                    }}
                  >
                    {t("skipGuide")}
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <div className={"day-tabs" + (mobile ? " desktop-only" : " ")}>
                  {shortNames.map((name, day) => (
                    <button
                      key={day}
                      className={
                        (mobile ? selectedDay : focus) === day ? "selected" : ""
                      }
                      aria-label={dayNames[day]}
                      aria-pressed={(mobile ? selectedDay : focus) === day}
                      onClick={() => {
                        setSelectedDay(day);
                        setFocus(day);
                      }}
                    >
                      {name}
                      <span>{Number(shiftDate(start, day).slice(-2))}</span>
                    </button>
                  ))}
                  {!mobile ? (
                    <button className="all-days" onClick={() => setFocus(null)}>
                      {t("allDays")}
                    </button>
                  ) : null}
                </div>
                <Board
                  mobile={mobile}
                  onFocus={setSelectedDay}
                  projects={shown}
                  start={start}
                  ended={week.ended}
                  todayDate={date}
                  focus={mobile ? selectedDay : focus}
                  onCheck={(sid) =>
                    mutate((w) => {
                      for (const p of w.projects)
                        for (const task of p.tasks) {
                          const step = task.subtasks.find((s) => s.id === sid);
                          if (step) step.done = !step.done;
                        }
                    })
                  }
                  onEdit={editTask}
                  onMove={openMove}
                  onAdd={(day) => newTask(day)}
                  onClearMissed={(sid, day) =>
                    mutate((w) => {
                      for (const p of w.projects)
                        for (const task of p.tasks) {
                          const step = task.subtasks.find((s) => s.id === sid);
                          if (step)
                            step.missed = step.missed.filter((d) => d !== day);
                        }
                    })
                  }
                  onDrop={moveStep}
                />
              </>
            )}
          </>
        ) : route === "stats" ? (
          <Suspense fallback={<p>{t("loading")}</p>}>
            <Stats plan={store.plan} onWeek={navigate} />
          </Suspense>
        ) : (
          <div className="weeks-page">
            {!store.plan.weeks.length ? (
              <p className="page-empty">{t("emptyWeeks")}</p>
            ) : (
              [...store.plan.weeks]
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((w) => {
                  const p = progress(w.projects);
                  return (
                    <article className="week-history" key={w.id}>
                      <div>
                        <span className="muted">
                          {w.start.slice(0, 4)} ·{" "}
                          {w.ended ? t("ended") : t("plan")}
                        </span>
                        <button
                          className="history-title"
                          onClick={() => navigate(w.start)}
                        >
                          {range(w.start, i18n.language)}
                        </button>
                        <p>
                          {p.done}/{p.total} {t("units")} · {p.percent}%
                        </p>
                      </div>
                      <div>
                        <button
                          className="secondary"
                          onClick={() => navigate(w.start)}
                        >
                          {t("view")}
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t("copy") + " " + w.start}
                          onClick={() => setDialog({ kind: "copy", source: w })}
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() =>
                            store.commit(
                              {
                                ...store.plan,
                                weeks: store.plan.weeks.filter(
                                  (old) => old.id !== w.id,
                                ),
                              },
                              "deleted",
                            )
                          }
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </article>
                  );
                })
            )}
          </div>
        )}
      </main>
      <nav className="mobile-nav" aria-label={t("plan")}>
        {nav.map(({ key, icon: Icon }) => (
          <button
            key={key}
            className={route === key ? "active" : ""}
            onClick={() => setRoute(key)}
          >
            <Icon size={20} />
            <span>{t(key)}</span>
          </button>
        ))}
      </nav>
      {store.notice ? (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{t(store.notice)}</span>
          {store.undoCount ? (
            <button onClick={store.undo}>
              <Undo2 size={16} />
              {t("undo")}
            </button>
          ) : null}
          <button
            className="toast-dismiss"
            aria-label={t("close")}
            onClick={() => store.setNotice("")}
          >
            ×
          </button>
        </div>
      ) : null}
      {needRefresh ? (
        <div className="update-banner">
          <span>{t("newVersion")}</span>
          <button
            className="primary"
            onClick={() => void updateServiceWorker(true)}
          >
            {t("updateApp")}
          </button>
        </div>
      ) : null}
      {store.mergeRequest ? (
        <Modal title={t("merge")} onClose={() => void store.logout()}>
          <p>{t("mergeHint")}</p>
          <div className="action-list">
            <button
              className="primary"
              onClick={() => store.resolveMerge(true)}
            >
              {t("merge")}
            </button>
            <button
              className="secondary"
              onClick={() => store.resolveMerge(false)}
            >
              {t("useCloud")}
            </button>
          </div>
        </Modal>
      ) : null}
      {dialog?.kind === "project" ? (
        <ProjectEditor
          project={dialog.project}
          onClose={close}
          onSave={(p) => {
            mutate((w) => {
              const index = w.projects.findIndex((old) => old.id === p.id);
              if (index < 0) w.projects.push(p);
              else w.projects[index] = p;
            });
            close();
          }}
          onDelete={
            dialog.project
              ? () => {
                  mutate(
                    (w) =>
                      (w.projects = w.projects.filter(
                        (p) => p.id !== dialog.project!.id,
                      )),
                    "deleted",
                  );
                  setFilter("");
                  close();
                }
              : undefined
          }
        />
      ) : null}
      {dialog?.kind === "task" ? (
        <TaskEditor
          task={dialog.task!}
          projectId={dialog.pid!}
          projects={week.projects}
          onClose={close}
          onSave={saveTask}
          onDelete={
            week.projects.some((p) =>
              p.tasks.some((task) => task.id === dialog.task?.id),
            )
              ? () => {
                  mutate(
                    (w) =>
                      w.projects.forEach(
                        (p) =>
                          (p.tasks = p.tasks.filter(
                            (task) => task.id !== dialog.task!.id,
                          )),
                      ),
                    "deleted",
                  );
                  close();
                }
              : undefined
          }
        />
      ) : null}
      {dialog?.kind === "projects" ? (
        <ProjectsManager
          onCreate={() => setDialog({ kind: "project" })}
          projects={week.projects}
          ended={week.ended}
          onClose={close}
          onEdit={(p) =>
            week.ended
              ? setDialog({ kind: "reopen" })
              : setDialog({ kind: "project", project: p })
          }
          onAdd={(pid) => newTask(selectedDay, pid)}
          onTask={editTask}
          onToggle={toggleTask}
          onReorder={(key, target, kind, parent) =>
            mutate((w) => {
              if (kind === "project")
                w.projects = arrayMove(
                  w.projects,
                  w.projects.findIndex((p) => p.id === key),
                  w.projects.findIndex((p) => p.id === target),
                );
              else {
                const p = w.projects.find((p) => p.id === parent);
                if (p)
                  p.tasks = arrayMove(
                    p.tasks,
                    p.tasks.findIndex((task) => task.id === key),
                    p.tasks.findIndex((task) => task.id === target),
                  );
              }
            })
          }
        />
      ) : null}
      {dialog?.kind === "copy" ? (
        <CopyDialog
          source={dialog.source ?? week}
          onClose={close}
          onCopy={async (projects) => {
            await navigator.clipboard.writeText(
              JSON.stringify(
                {
                  format: "weekdam.plan.v1",
                  sourceWeek: (dialog.source ?? week).start,
                  projects,
                },
                null,
                2,
              ),
            );
            close();
            store.setNotice("copied");
          }}
        />
      ) : null}
      {dialog?.kind === "paste" ? (
        <PasteDialog
          error={store.error ? t(store.error) : undefined}
          start={start}
          onClose={close}
          onPaste={paste}
        />
      ) : null}
      {dialog?.kind === "manage" ? (
        <Modal
          title={t("manage")}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <div className="action-list">
            {week.ended ? (
              <button onClick={() => setDialog({ kind: "reopen" })}>
                {t("reopen")}
                <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button
                  disabled={!week.projects.length}
                  onClick={() => {
                    setTarget(shiftDate(start, 7));
                    setDialog({ kind: "move" });
                  }}
                >
                  {t("moveWork")}
                  <ArrowRight size={18} />
                </button>
                <button
                  disabled={
                    !week.projects.length ||
                    start > currentStart ||
                    store.plan.weeks.some(
                      (w) =>
                        w.start < start && !w.ended && w.projects.length > 0,
                    )
                  }
                  onClick={() => setDialog({ kind: "end" })}
                >
                  {t("endWeek")}
                  <ArrowRight size={18} />
                </button>
                <button
                  className="danger"
                  disabled={!week.projects.length}
                  onClick={() => setDialog({ kind: "clear" })}
                >
                  {t("clearBoard")}
                </button>
              </>
            )}
          </div>
        </Modal>
      ) : null}
      {dialog?.kind === "end" ||
      dialog?.kind === "reopen" ||
      dialog?.kind === "clear" ? (
        <Modal
          title={t(
            dialog.kind === "end"
              ? "endWeek"
              : dialog.kind === "reopen"
                ? "reopen"
                : "clearBoard",
          )}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <p>
            {t(
              dialog.kind === "end"
                ? "endHint"
                : dialog.kind === "reopen"
                  ? "reopenHint"
                  : "clearHint",
            )}
          </p>
          {dialog.kind === "end" ? (
            <div className="action-list">
              {count.done < count.total ? (
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      store.commit(endWeek(store.plan, start, true));
                      navigate(shiftDate(start, 7));
                      close();
                    } catch {
                      store.setError("occupied");
                    }
                  }}
                >
                  {t("carry")}
                </button>
              ) : null}
              <button
                className="secondary"
                onClick={() => {
                  store.commit(endWeek(store.plan, start, false));
                  navigate(shiftDate(start, 7));
                  close();
                }}
              >
                {t(count.done === count.total ? "endWeek" : "noCarry")}
              </button>
            </div>
          ) : (
            <footer className="dialog-actions">
              <button className="secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (dialog.kind === "reopen")
                    mutate((w) => (w.ended = false));
                  else
                    store.commit(
                      {
                        ...store.plan,
                        weeks: store.plan.weeks.filter(
                          (w) => w.start !== start,
                        ),
                      },
                      "deleted",
                    );
                  close();
                }}
              >
                {t(dialog.kind === "reopen" ? "reopen" : "delete")}
              </button>
            </footer>
          )}
        </Modal>
      ) : null}
      {dialog?.kind === "move" ? (
        <Modal
          title={t("moveWork")}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              try {
                const dest = weekStart(target);
                store.commit(moveWeek(store.plan, start, dest));
                navigate(dest);
                close();
              } catch {
                store.setError("occupied");
              }
            }}
          >
            <label>
              {t("targetWeek")}
              <input
                required
                type="date"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <p className="muted">
              {target ? range(weekStart(target), i18n.language) : ""}
            </p>
            <footer className="dialog-actions">
              <button type="button" className="secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button className="primary">{t("move")}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
      {dialog?.kind === "move-day" ? (
        <Modal
          title={t("moveDay")}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <label>
            {t("moveDay")}
            <select
              value={moveDay}
              onChange={(e) => setMoveDay(Number(e.target.value))}
            >
              {dayNames.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={markMissed}
              onChange={(e) => setMarkMissed(e.target.checked)}
            />
            {t("markMissed")}
          </label>
          <footer className="dialog-actions">
            <button className="secondary" onClick={close}>
              {t("cancel")}
            </button>
            <button
              className="primary"
              onClick={() => {
                moveStep(dialog.stepId!, moveDay, undefined, markMissed);
                close();
              }}
            >
              {t("move")}
            </button>
          </footer>
        </Modal>
      ) : null}
      {dialog?.kind === "settings" ? (
        <Modal
          title={t("settings")}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <label>
            {t("language")}
            <select
              aria-label={t("language")}
              value={i18n.language}
              onChange={(e) => {
                void i18n.changeLanguage(e.target.value);
                localStorage.setItem("weekdam:language", e.target.value);
              }}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t("theme")}
            <select
              aria-label={t("theme")}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {["light", "dark", "system"].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={guide}
              onChange={(e) => {
                setGuide(e.target.checked);
                localStorage.setItem(
                  "weekdam:guide",
                  e.target.checked ? "yes" : "no",
                );
              }}
            />
            {t("guide")}
          </label>
          <div className="settings-section">
            <h3>{t("backup")}</h3>
            <div className="button-row">
              <button className="secondary" onClick={exportBackup}>
                {t("export")}
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setBackupText("");
                  setDialog({ kind: "backup" });
                }}
              >
                {t("import")}
              </button>
            </div>
          </div>
          <div className="settings-section">
            <h3>{store.profile?.name || t("google")}</h3>
            <p className="muted">
              {t(store.configured ? "syncHint" : "syncUnavailable")}
            </p>
            {store.profile ? (
              <button className="secondary" onClick={() => void store.logout()}>
                {t("logout")}
              </button>
            ) : (
              <button
                className="secondary"
                disabled={!store.loginReady}
                onClick={() => store.login(i18n.language)}
              >
                {t("google")}
              </button>
            )}
          </div>
        </Modal>
      ) : null}
      {dialog?.kind === "backup" ? (
        <Modal
          title={t("import")}
          onClose={close}
          error={store.error ? t(store.error) : undefined}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                store.commit(mergePlans(store.plan, parseBackup(backupText)));
                close();
              } catch {
                store.setError("invalid");
              }
            }}
          >
            <p className="muted">{t("importHint")}</p>
            <input
              type="file"
              accept="application/json,.json"
              aria-label={t("import")}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 5_000_000) store.setError("invalid");
                  else setBackupText(await file.text());
                }
              }}
            />
            <label>
              JSON
              <textarea
                required
                rows={8}
                maxLength={5_000_000}
                value={backupText}
                onChange={(e) => setBackupText(e.target.value)}
              />
            </label>
            <footer className="dialog-actions">
              <button type="button" className="secondary" onClick={close}>
                {t("cancel")}
              </button>
              <button className="primary">{t("merge")}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
