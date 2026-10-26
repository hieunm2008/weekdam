import type { Project, Weight } from "../domain";

/** Planning metadata only. Demo billing is deliberately stored separately. */
export interface TaskSource {
  kind: "exam" | "recurrence";
  operationId: string;
  seriesId?: string;
  occurrenceDate?: string;
  detached?: boolean;
}

export interface PersonalTemplate {
  id: string;
  name: string;
  sourceWeek: string;
  projects: Project[];
}

export interface RecurrenceRule {
  id: string;
  operationId: string;
  name: string;
  note: string;
  weight: Weight;
  /** Monday is 0, Sunday is 6, as in planner subtasks. */
  days: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  stoppedFrom?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  offsetsMinutes: number[];
  browserNotifications: boolean;
}

export interface ProPlanData {
  templates?: PersonalTemplate[];
  recurrenceRules?: RecurrenceRule[];
  /** Durable idempotency ledger, including operations whose tasks were deleted. */
  appliedOperations?: string[];
  reminders?: ReminderSettings;
}
