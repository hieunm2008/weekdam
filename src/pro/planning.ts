import {
  appendBoardProjects,
  clone,
  replaceWeek,
  shiftDate,
  taskDone,
  today,
  weekAt,
  weekStart,
  type Plan,
  type Project,
  type Week,
  type Weight,
} from "../domain";
import { minutesToTime, timeToMinutes, validTimeRange } from "../calendar";
import type { PersonalTemplate, RecurrenceRule, TaskSource } from "./types";

const DAY = 86400000;
const dayDifference = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
function fingerprint(value: unknown): string {
  const raw = JSON.stringify(value);
  let first = 2166136261,
    second = 5381;
  for (let i = 0; i < raw.length; i++) {
    first = Math.imul(first ^ raw.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ raw.charCodeAt(i);
  }
  return (first >>> 0).toString(36) + (second >>> 0).toString(36);
}
function minuteInVietnam(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (
    part("hour") * 60 +
    part("minute") +
    (part("second") || now.getMilliseconds() ? 1 : 0)
  );
}
interface Interval {
  start: number;
  end: number;
}
function mergeIntervals(input: Interval[]): Interval[] {
  const output: Interval[] = [];
  for (const interval of [...input].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )) {
    const last = output.at(-1);
    if (last && interval.start <= last.end)
      last.end = Math.max(last.end, interval.end);
    else output.push({ ...interval });
  }
  return output;
}
function busyOn(
  plan: Plan,
  date: string,
  ignoreTaskIds: Set<string> = new Set(),
): Interval[] {
  const start = weekStart(date),
    day = dayDifference(start, date);
  return mergeIntervals(
    (plan.weeks.find((w) => w.start === start)?.projects ?? []).flatMap((p) =>
      p.tasks.flatMap((t) =>
        ignoreTaskIds.has(t.id)
          ? []
          : t.subtasks.flatMap((s) =>
              s.day === day && validTimeRange(s.startTime!, s.endTime!)
                ? [
                    {
                      start: timeToMinutes(s.startTime!),
                      end: timeToMinutes(s.endTime!),
                    },
                  ]
                : [],
            ),
      ),
    ),
  );
}
function freeIntervals(available: Interval[], busy: Interval[]): Interval[] {
  let result = mergeIntervals(available);
  for (const block of busy)
    result = result.flatMap((slot) =>
      block.end <= slot.start || block.start >= slot.end
        ? [slot]
        : [
            ...(block.start > slot.start
              ? [{ start: slot.start, end: block.start }]
              : []),
            ...(block.end < slot.end
              ? [{ start: block.end, end: slot.end }]
              : []),
          ],
    );
  return result;
}
function withOperation(plan: Plan, operationId: string): Plan {
  return {
    ...plan,
    pro: {
      ...plan.pro,
      appliedOperations: [...(plan.pro?.appliedOperations ?? []), operationId],
    },
  };
}
function alreadyApplied(plan: Plan, operationId: string): boolean {
  return Boolean(plan.pro?.appliedOperations?.includes(operationId));
}

export interface Availability {
  day: number;
  startTime: string;
  endTime: string;
}
export interface ExamInput {
  subject: string;
  startDate?: string;
  examDate: string;
  topics: { name: string; minutes: number }[];
  sessionMinutes?: number;
  availability: Availability[];
}
export interface StudySession {
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  topicIndex: number;
  minutes: number;
}
export interface ExamPreview {
  kind: "exam";
  operationId: string;
  subject: string;
  examDate: string;
  sessions: StudySession[];
  requiredMinutes: number;
  scheduledMinutes: number;
  missingMinutes: number;
  complete: boolean;
}
export function previewExam(
  plan: Plan,
  input: ExamInput,
  now = new Date(),
): ExamPreview {
  const startDate = input.startDate || today(now),
    sessionMinutes = input.sessionMinutes ?? 50;
  if (
    !validDate(startDate) ||
    !validDate(input.examDate) ||
    dayDifference(startDate, input.examDate) < 1 ||
    dayDifference(startDate, input.examDate) > 180
  )
    throw new Error("exam-range");
  if (!input.subject.trim() || input.subject.length > 300)
    throw new Error("invalid-subject");
  if (
    !Number.isInteger(sessionMinutes) ||
    sessionMinutes < 1 ||
    sessionMinutes > 1439
  )
    throw new Error("invalid-session-duration");
  if (
    !input.topics.length ||
    input.topics.some(
      (t) =>
        !t.name.trim() ||
        t.name.length > 500 ||
        !Number.isSafeInteger(t.minutes) ||
        t.minutes < 1 ||
        t.minutes > 180 * 1439,
    )
  )
    throw new Error("invalid-topics");
  if (
    input.availability.some(
      (slot) =>
        !Number.isInteger(slot.day) ||
        slot.day < 0 ||
        slot.day > 6 ||
        !validTimeRange(slot.startTime, slot.endTime),
    )
  )
    throw new Error("invalid-availability");
  const units = input.topics.flatMap((topic, topicIndex) => {
    const sessions = [];
    for (
      let remaining = topic.minutes;
      remaining > 0;
      remaining -= sessionMinutes
    )
      sessions.push({
        topic: topic.name.trim(),
        topicIndex,
        minutes: Math.min(remaining, sessionMinutes),
      });
    return sessions;
  });
  const sessions: StudySession[] = [],
    currentDay = today(now);
  let next = 0;
  for (
    let date = startDate;
    date < input.examDate && next < units.length;
    date = shiftDate(date, 1)
  ) {
    const start = weekStart(date);
    if (
      date < currentDay ||
      plan.weeks.some((w) => w.start === start && w.ended)
    )
      continue;
    const weekday = dayDifference(start, date),
      minimum = date === currentDay ? minuteInVietnam(now) : 0;
    const availability = input.availability
      .filter((slot) => slot.day === weekday)
      .map((slot) => ({
        start: Math.max(minimum, timeToMinutes(slot.startTime)),
        end: timeToMinutes(slot.endTime),
      }))
      .filter((slot) => slot.start < slot.end);
    for (const gap of freeIntervals(availability, busyOn(plan, date))) {
      let cursor = gap.start;
      while (next < units.length && cursor + units[next].minutes <= gap.end) {
        const unit = units[next++];
        sessions.push({
          ...unit,
          date,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(cursor + unit.minutes),
        });
        cursor += unit.minutes;
      }
    }
  }
  const requiredMinutes = input.topics.reduce(
      (sum, topic) => sum + topic.minutes,
      0,
    ),
    scheduledMinutes = sessions.reduce(
      (sum, session) => sum + session.minutes,
      0,
    );
  return {
    kind: "exam",
    operationId: "exam_" + fingerprint({ input, sessions }),
    subject: input.subject.trim(),
    examDate: input.examDate,
    sessions,
    requiredMinutes,
    scheduledMinutes,
    missingMinutes: requiredMinutes - scheduledMinutes,
    complete: requiredMinutes === scheduledMinutes,
  };
}
export function applyExam(
  plan: Plan,
  preview: ExamPreview,
  now = new Date(),
): Plan {
  if (alreadyApplied(plan, preview.operationId)) return plan;
  if (!preview.complete || preview.missingMinutes || !preview.sessions.length)
    throw new Error("incomplete-preview");
  assertFutureSessions(preview.sessions, now);
  let result = clone(plan);
  const byWeek = new Map<string, StudySession[]>();
  for (const session of preview.sessions) {
    const start = weekStart(session.date);
    if (weekAt(result, start).ended) throw new Error("destination-ended");
    if (
      busyOn(plan, session.date).some(
        (b) =>
          timeToMinutes(session.startTime) < b.end &&
          timeToMinutes(session.endTime) > b.start,
      )
    )
      throw new Error("preview-conflict");
    byWeek.set(start, [...(byWeek.get(start) ?? []), session]);
  }
  for (const [start, sessions] of byWeek) {
    const source: TaskSource = {
      kind: "exam",
      operationId: preview.operationId,
    };
    const project: Project = {
      id: preview.operationId + "_p_" + start,
      name: preview.subject,
      deadline: preview.examDate,
      tasks: sessions.map((session) => {
        const index = preview.sessions.indexOf(session),
          base = preview.operationId + "_" + index;
        return {
          id: base + "_t",
          name: session.topic,
          note: "",
          done: false,
          deadline: preview.examDate,
          source,
          subtasks: [
            {
              id: base + "_s",
              day: dayDifference(start, session.date),
              weight: 1,
              note: "",
              done: false,
              missed: [],
              startTime: session.startTime,
              endTime: session.endTime,
              source,
            },
          ],
        };
      }),
    };
    const week = weekAt(result, start);
    result = replaceWeek(result, {
      ...week,
      projects: appendBoardProjects(week.projects, [project]),
    });
  }
  return withOperation(result, preview.operationId);
}

export interface RecurrenceInput {
  name: string;
  note: string;
  weight: Weight;
  days: number[];
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
}
export interface RecurrenceSession {
  date: string;
  startTime: string;
  endTime: string;
}
export interface ScheduleConflict {
  date: string;
  startTime: string;
  endTime: string;
}
export interface RecurrencePreview {
  kind: "recurrence";
  operationId: string;
  rule: RecurrenceRule;
  sessions: RecurrenceSession[];
  conflicts: ScheduleConflict[];
}
export interface OccurrencePatch {
  name?: string;
  note?: string;
  weight?: Weight;
  startTime?: string;
  endTime?: string;
}
export function previewRecurrence(
  plan: Plan,
  input: RecurrenceInput,
  now = new Date(),
): RecurrencePreview {
  const startDate = input.startDate || today(now),
    endDate = input.endDate || shiftDate(startDate, 83);
  if (
    !validDate(startDate) ||
    !validDate(endDate) ||
    dayDifference(startDate, endDate) < 0 ||
    dayDifference(startDate, endDate) > 181
  )
    throw new Error("recurrence-range");
  if (
    !input.name.trim() ||
    input.name.length > 300 ||
    input.note.length > 10000 ||
    ![1, 2, 3].includes(input.weight) ||
    !validTimeRange(input.startTime, input.endTime) ||
    !input.days.length ||
    input.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error("invalid-recurrence");
  const normalized = {
    name: input.name.trim(),
    note: input.note,
    weight: input.weight,
    days: [...new Set(input.days)].sort(),
    startTime: input.startTime,
    endTime: input.endTime,
    startDate,
    endDate,
  };
  const operationId = "recurrence_" + fingerprint(normalized),
    rule: RecurrenceRule = {
      ...normalized,
      id: operationId + "_rule",
      operationId,
    };
  const sessions: RecurrenceSession[] = [],
    currentDay = today(now);
  for (let date = startDate; date <= endDate; date = shiftDate(date, 1)) {
    const start = weekStart(date);
    if (
      date < currentDay ||
      (date === currentDay &&
        timeToMinutes(input.startTime) < minuteInVietnam(now)) ||
      weekAt(plan, start).ended ||
      !rule.days.includes(dayDifference(start, date))
    )
      continue;
    sessions.push({ date, startTime: input.startTime, endTime: input.endTime });
  }
  return {
    kind: "recurrence",
    operationId,
    rule,
    sessions,
    conflicts: findConflicts(plan, sessions),
  };
}
function findConflicts(
  plan: Plan,
  sessions: RecurrenceSession[],
): ScheduleConflict[] {
  return sessions
    .filter((s) =>
      busyOn(plan, s.date).some(
        (b) =>
          timeToMinutes(s.startTime) < b.end &&
          timeToMinutes(s.endTime) > b.start,
      ),
    )
    .map((s) => ({ ...s }));
}
export function applyRecurrence(
  plan: Plan,
  preview: RecurrencePreview,
  allowConflicts = false,
  now = new Date(),
): Plan {
  if (alreadyApplied(plan, preview.operationId)) return plan;
  if (!preview.sessions.length) throw new Error("empty-recurrence");
  assertFutureSessions(preview.sessions, now);
  if (!allowConflicts && findConflicts(plan, preview.sessions).length)
    throw new Error("recurrence-conflicts");
  let result = clone(plan);
  for (const session of preview.sessions) {
    const start = weekStart(session.date),
      week = weekAt(result, start);
    if (week.ended) throw new Error("destination-ended");
    let project = week.projects.find(
      (p) => p.id === preview.operationId + "_p_" + start,
    );
    if (!project) {
      project = {
        id: preview.operationId + "_p_" + start,
        name: preview.rule.name,
        tasks: [],
      };
      week.projects = [...week.projects, project];
    }
    const base = preview.operationId + "_" + session.date;
    const source: TaskSource = {
      kind: "recurrence",
      operationId: preview.operationId,
      seriesId: preview.rule.id,
      occurrenceDate: session.date,
    };
    project.tasks.push({
      id: base + "_t",
      name: preview.rule.name,
      note: preview.rule.note,
      done: false,
      source,
      subtasks: [
        {
          id: base + "_s",
          day: dayDifference(start, session.date),
          weight: preview.rule.weight,
          note: "",
          done: false,
          missed: [],
          startTime: session.startTime,
          endTime: session.endTime,
          source: { ...source },
        },
      ],
    });
    result = replaceWeek(result, week);
  }
  result = withOperation(result, preview.operationId);
  result.pro = {
    ...result.pro,
    recurrenceRules: [
      ...(result.pro?.recurrenceRules ?? []),
      clone(preview.rule),
    ],
  };
  return result;
}
function assertFutureSessions(sessions: RecurrenceSession[], now: Date): void {
  const currentDay = today(now),
    minimum = minuteInVietnam(now);
  if (
    sessions.some(
      (session) =>
        session.date < currentDay ||
        (session.date === currentDay &&
          timeToMinutes(session.startTime) < minimum),
    )
  )
    throw new Error("preview-expired");
}
export function editOccurrence(
  plan: Plan,
  taskId: string,
  patch: OccurrencePatch | null,
  scope: "single" | "future" | "stop",
  now = new Date(),
): Plan {
  const selectedWeek = plan.weeks.find((week) =>
    week.projects.some((project) =>
      project.tasks.some((task) => task.id === taskId),
    ),
  );
  const selected = selectedWeek?.projects
    .flatMap((project) => project.tasks)
    .find((task) => task.id === taskId);
  if (
    !selected ||
    selected.source?.kind !== "recurrence" ||
    !selected.source.seriesId ||
    !selected.source.occurrenceDate
  )
    throw new Error("not-recurring");
  if (scope === "single" && selectedWeek?.ended)
    throw new Error("destination-ended");
  if (
    patch &&
    ((patch.name !== undefined &&
      (!patch.name.trim() || patch.name.length > 500)) ||
      (patch.note !== undefined && patch.note.length > 10000) ||
      (patch.weight !== undefined && ![1, 2, 3].includes(patch.weight)))
  )
    throw new Error("invalid-occurrence");
  const result = clone(plan),
    cutoff = selected.source.occurrenceDate,
    seriesId = selected.source.seriesId,
    currentDay = today(now);
  for (const week of result.weeks)
    for (const project of week.projects)
      project.tasks = project.tasks.flatMap((task) => {
        const source = task.source;
        const matches =
          scope === "single"
            ? task.id === taskId
            : source?.seriesId === seriesId &&
              (source.occurrenceDate ?? "") >= cutoff &&
              !source.detached &&
              !task.subtasks.some((s) => s.source?.detached) &&
              !week.ended &&
              !taskDone(task) &&
              (source.occurrenceDate ?? "") >= currentDay;
        if (!matches) return [task];
        if (scope === "stop" || patch === null) return [];
        if (patch.name !== undefined) task.name = patch.name.trim();
        if (patch.note !== undefined) task.note = patch.note;
        if (scope === "single")
          task.source = { ...task.source!, detached: true };
        for (const step of task.subtasks) {
          const start = patch.startTime ?? step.startTime,
            end = patch.endTime ?? step.endTime;
          if (!validTimeRange(start!, end!))
            throw new Error("invalid-occurrence-time");
          step.startTime = start;
          step.endTime = end;
          if (patch.weight !== undefined) step.weight = patch.weight;
          if (scope === "single")
            step.source = { ...step.source!, detached: true };
        }
        return [task];
      });
  if (scope !== "single")
    result.pro = {
      ...result.pro,
      recurrenceRules: result.pro?.recurrenceRules?.map((rule) => {
        if (rule.id !== seriesId) return rule;
        if (scope === "stop" || patch === null)
          return {
            ...rule,
            stoppedFrom:
              rule.stoppedFrom && rule.stoppedFrom < cutoff
                ? rule.stoppedFrom
                : cutoff,
          };
        return { ...rule, ...patch, name: patch.name?.trim() ?? rule.name };
      }),
    };
  return result;
}

export interface TemplatePreview {
  kind: "template";
  operationId: string;
  templateId: string;
  targetWeek: string;
  projects: Project[];
  conflicts: ScheduleConflict[];
}
function contentProjects(
  projects: Project[],
  prefix: string,
  shift = 0,
): Project[] {
  const deadline = (value?: string) =>
    value ? shiftDate(value.slice(0, 10), shift) + value.slice(10) : value;
  return projects.map((project, p) => ({
    id: prefix + "_p_" + p,
    name: project.name,
    ...(project.deadline ? { deadline: deadline(project.deadline) } : {}),
    tasks: project.tasks.map((task, t) => ({
      id: prefix + "_p_" + p + "_t_" + t,
      name: task.name,
      note: task.note,
      done: false,
      ...(task.deadline ? { deadline: deadline(task.deadline) } : {}),
      subtasks: task.subtasks.map((step, s) => ({
        id: prefix + "_p_" + p + "_t_" + t + "_s_" + s,
        day: step.day,
        weight: step.weight,
        note: step.note,
        done: false,
        missed: [],
        ...(step.startTime
          ? { startTime: step.startTime, endTime: step.endTime }
          : {}),
        ...(step.dayOrder === undefined ? {} : { dayOrder: step.dayOrder }),
      })),
    })),
  }));
}
export function captureTemplate(
  week: Week,
  projectIds: string[],
  name: string,
  templateId: string,
): PersonalTemplate {
  if (
    !name.trim() ||
    name.length > 300 ||
    !templateId ||
    templateId.length > 100 ||
    !/^[A-Za-z0-9_.:-]+$/.test(templateId)
  )
    throw new Error("invalid-template");
  const selected = week.projects.filter((project) =>
    projectIds.includes(project.id),
  );
  if (!selected.length) throw new Error("empty-template");
  return {
    id: templateId,
    name: name.trim(),
    sourceWeek: week.start,
    projects: contentProjects(selected, templateId),
  };
}
export function builtInTemplates(language: "vi" | "en"): PersonalTemplate[] {
  const vi = language === "vi";
  const definitions = [
    {
      id: "exam",
      name: vi ? "Ôn thi cuối kỳ" : "Final exam revision",
      tasks: vi
        ? ["Ôn lý thuyết", "Làm đề thử", "Sửa bài và tổng kết"]
        : ["Review theory", "Practice exam", "Review mistakes"],
      days: [0, 2, 4],
      duration: 50,
    },
    {
      id: "ielts",
      name: vi ? "Luyện IELTS" : "IELTS preparation",
      tasks: vi
        ? ["Nghe và từ vựng", "Đọc hiểu", "Viết và nói"]
        : ["Listening and vocabulary", "Reading", "Writing and speaking"],
      days: [1, 3, 5],
      duration: 60,
    },
    {
      id: "coding",
      name: vi ? "Học lập trình" : "Learn programming",
      tasks: vi
        ? ["Học kiến thức mới", "Luyện bài tập", "Xây dựng dự án nhỏ"]
        : ["Learn a new concept", "Solve exercises", "Build a small project"],
      days: [0, 2, 5],
      duration: 50,
    },
  ];
  return definitions.map((definition) => {
    const prefix = "builtin_" + definition.id;
    return {
      id: prefix,
      name: definition.name,
      sourceWeek: "2026-01-05",
      projects: [
        {
          id: prefix + "_p",
          name: definition.name,
          deadline: "2026-01-11",
          tasks: definition.tasks.map((name, index) => ({
            id: prefix + "_t_" + index,
            name,
            note: "",
            done: false,
            deadline: shiftDate("2026-01-05", definition.days[index]),
            subtasks: [
              {
                id: prefix + "_s_" + index,
                day: definition.days[index],
                weight: 2 as Weight,
                note: "",
                done: false,
                missed: [],
                startTime: "19:00",
                endTime: minutesToTime(19 * 60 + definition.duration),
              },
            ],
          })),
        },
      ],
    };
  });
}
function projectSessions(
  projects: Project[],
  targetWeek: string,
): RecurrenceSession[] {
  return projects.flatMap((project) =>
    project.tasks.flatMap((task) =>
      task.subtasks.flatMap((step) =>
        validTimeRange(step.startTime!, step.endTime!)
          ? [
              {
                date: shiftDate(targetWeek, step.day),
                startTime: step.startTime!,
                endTime: step.endTime!,
              },
            ]
          : [],
      ),
    ),
  );
}
function templateConflicts(
  plan: Plan,
  projects: Project[],
  targetWeek: string,
): ScheduleConflict[] {
  const sessions = projectSessions(projects, targetWeek);
  return sessions.filter(
    (session, index) =>
      findConflicts(plan, [session]).length > 0 ||
      sessions
        .slice(0, index)
        .some(
          (other) =>
            other.date === session.date &&
            timeToMinutes(other.startTime) < timeToMinutes(session.endTime) &&
            timeToMinutes(other.endTime) > timeToMinutes(session.startTime),
        ),
  );
}
export function previewTemplate(
  plan: Plan,
  template: PersonalTemplate,
  targetWeek: string,
): TemplatePreview {
  if (
    !validDate(targetWeek) ||
    weekStart(targetWeek) !== targetWeek ||
    !validDate(template.sourceWeek) ||
    weekStart(template.sourceWeek) !== template.sourceWeek
  )
    throw new Error("invalid-template-week");
  if (weekAt(plan, targetWeek).ended) throw new Error("destination-ended");
  if (!template.projects.length) throw new Error("empty-template");
  const existingIds = plan.weeks.flatMap((w) =>
    w.projects.flatMap((p) => [
      p.id,
      ...p.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]),
    ]),
  );
  const operationId =
    "template_" +
    fingerprint({
      template,
      targetWeek,
      existingIds,
      operations: plan.pro?.appliedOperations ?? [],
    });
  const projects = contentProjects(
    template.projects,
    operationId,
    dayDifference(template.sourceWeek, targetWeek),
  );
  return {
    kind: "template",
    operationId,
    templateId: template.id,
    targetWeek,
    projects,
    conflicts: templateConflicts(plan, projects, targetWeek),
  };
}
export function applyTemplate(
  plan: Plan,
  preview: TemplatePreview,
  allowConflicts = false,
): Plan {
  if (alreadyApplied(plan, preview.operationId)) return plan;
  const week = weekAt(plan, preview.targetWeek);
  if (week.ended) throw new Error("destination-ended");
  if (
    !allowConflicts &&
    templateConflicts(plan, preview.projects, preview.targetWeek).length
  )
    throw new Error("template-conflicts");
  return withOperation(
    replaceWeek(clone(plan), {
      ...clone(week),
      projects: appendBoardProjects(week.projects, clone(preview.projects)),
    }),
    preview.operationId,
  );
}
