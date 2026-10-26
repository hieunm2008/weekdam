import { mergePlans, shiftDate, today, weekStart, type Plan } from "../domain";
/** Explicit sample seed. It never grants a subscription or changes billing. */
export function demoStudyPlan(now = new Date()): Plan {
  const date = today(now),
    start = weekStart(date),
    day = Math.round((Date.parse(date) - Date.parse(start)) / 86400000),
    stamp = Date.parse(date + "T10:00:00+07:00");
  return {
    version: 1,
    weeks: [
      {
        id: "week_" + start,
        start,
        ended: false,
        projects: [
          {
            id: "demo-study-project",
            name: "IELTS",
            deadline: shiftDate(date, 3),
            tasks: [
              {
                id: "demo-study-task",
                name: "Reading practice",
                note: "Dữ liệu demo / Sample data",
                done: false,
                deadline: shiftDate(date, 1),
                subtasks: [
                  {
                    id: "demo-study-step",
                    day,
                    weight: 2,
                    note: "",
                    done: false,
                    missed: [],
                    startTime: "09:00",
                    endTime: "09:50",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    pomodoroSessions: [
      {
        id: "demo-focus-session",
        startedAt: stamp - 25 * 60000,
        endedAt: stamp,
        plannedDurationMs: 25 * 60000,
        focusedDurationMs: 22 * 60000,
        outcome: "stopped",
        task: {
          id: "demo-study-task",
          name: "Reading practice",
          projectName: "IELTS",
        },
      },
    ],
  };
}
export function addDemoStudyData(plan: Plan, now = new Date()): Plan {
  return mergePlans(plan, demoStudyPlan(now));
}
