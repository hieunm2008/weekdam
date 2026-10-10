import { describe, expect, it } from "vitest";
import * as domain from "./domain";
import type { Plan, Project, Subtask, Week } from "./domain";

const step = (id: string, day = 0, dayOrder?: number): Subtask => ({
  id,
  day,
  weight: 1,
  note: id,
  done: false,
  missed: [],
  ...(dayOrder === undefined ? {} : { dayOrder }),
});
function fixture(): Week {
  return {
    id: "week_2026-10-05",
    start: "2026-10-05",
    ended: false,
    projects: [
      {
        id: "p-a",
        name: "A",
        tasks: [
          {
            id: "t-a",
            name: "Alpha",
            note: "",
            done: false,
            subtasks: [step("a"), step("b"), step("other", 1)],
          },
        ],
      },
      {
        id: "p-b",
        name: "B",
        tasks: [
          {
            id: "t-b",
            name: "Beta",
            note: "",
            done: false,
            subtasks: [step("c"), step("target", 1)],
          },
        ],
      },
    ],
  };
}
const ids = (week: Week, day: number) =>
  domain.dayCards(week.projects, day).map((row) => row.step.id);
const plan = (week: Week): Plan => ({ version: 1, weeks: [week] });

describe("independent day card order", () => {
  it("keeps legacy order and sorts ranked cards deterministically without regrouping projects", () => {
    const w = fixture();
    expect(ids(w, 0)).toEqual(["a", "b", "c"]);
    const [a, b] = w.projects[0].tasks[0].subtasks;
    const c = w.projects[1].tasks[0].subtasks[0];
    a.dayOrder = 2048;
    b.dayOrder = 1024;
    c.dayOrder = 1024;
    expect(ids(w, 0)).toEqual(["b", "c", "a"]);
    expect(w.projects[0].tasks[0].subtasks.map((s) => s.id)).toEqual([
      "a",
      "b",
      "other",
    ]);
  });
  it("reorders across project boundaries while preserving task ownership and completion", () => {
    const w = fixture();
    w.projects[1].tasks[0].subtasks[0].done = true;
    const moved = domain.moveBoardCard(w, "c", 0, { id: "a", edge: "before" });
    expect(ids(moved, 0)).toEqual(["c", "a", "b"]);
    expect(ids(w, 0)).toEqual(["a", "b", "c"]);
    expect(moved.projects[1].tasks[0].subtasks[0]).toMatchObject({
      id: "c",
      done: true,
      day: 0,
    });
    expect(moved.projects[0].tasks[0].subtasks.map((s) => s.id)).toEqual([
      "a",
      "b",
      "other",
    ]);
  });
  it("moves only one card, places it after an anchor and clears its destination missed marker", () => {
    const w = fixture();
    w.projects[0].tasks[0].subtasks[0].missed = [1];
    const moved = domain.moveBoardCard(
      w,
      "a",
      1,
      { id: "other", edge: "after" },
      true,
    );
    expect(ids(moved, 0)).toEqual(["b", "c"]);
    expect(ids(moved, 1)).toEqual(["other", "a", "target"]);
    expect(moved.projects[0].tasks[0].subtasks[0].missed).toEqual([0]);
    expect(moved.projects[0].tasks[0].subtasks[1].day).toBe(0);
  });
  it("uses the full day when filtering so hidden cards keep their relative order", () => {
    const w = fixture();
    const moved = domain.moveBoardCard(w, "target", 0, {
      id: "b",
      edge: "before",
    });
    expect(ids(moved, 0)).toEqual(["a", "target", "b", "c"]);
    expect(ids(moved, 0).filter((id) => id !== "target")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("rejects ended weeks, invalid days and stale anchors without changing data", () => {
    const w = fixture();
    expect(domain.moveBoardCard({ ...w, ended: true }, "a", 1)).toEqual({
      ...w,
      ended: true,
    });
    expect(domain.moveBoardCard(w, "a", 7)).toEqual(w);
    expect(
      domain.moveBoardCard(w, "a", 1, { id: "missing", edge: "before" }),
    ).toEqual(w);
    expect(domain.moveBoardCard(w, "missing", 1)).toEqual(w);
  });
  it("renormalizes a tight insertion gap without changing unrelated days", () => {
    const w = fixture();
    w.projects[0].tasks[0].subtasks[0].dayOrder = 1;
    w.projects[0].tasks[0].subtasks[1].dayOrder = 1 + 1e-9;
    const moved = domain.moveBoardCard(w, "c", 0, { id: "b", edge: "before" });
    expect(ids(moved, 0)).toEqual(["a", "c", "b"]);
    expect(
      domain
        .dayCards(moved.projects, 0)
        .every((row) => Number.isFinite(row.step.dayOrder)),
    ).toBe(true);
    expect(moved.projects[0].tasks[0].subtasks[2]).toEqual(
      w.projects[0].tasks[0].subtasks[2],
    );
  });
  it("renormalizes duplicate ranks when inserting between tied cards", () => {
    const w = fixture();
    for (const row of domain.dayCards(w.projects, 0)) row.step.dayOrder = 1024;
    const moved = domain.moveBoardCard(w, "target", 0, {
      id: "b",
      edge: "before",
    });
    expect(ids(moved, 0)).toEqual(["a", "target", "b", "c"]);
  });
  it("makes room before a zero rank and after the maximum rank", () => {
    for (const boundary of [0, 1_000_000_000]) {
      const w = fixture();
      for (const row of domain.dayCards(w.projects, 0))
        row.step.dayOrder = boundary;
      const moved = domain.moveBoardCard(
        w,
        "target",
        0,
        boundary === 0 ? { id: "a", edge: "before" } : undefined,
      );
      expect(ids(moved, 0)).toEqual(
        boundary === 0 ? ["target", "a", "b", "c"] : ["a", "b", "c", "target"],
      );
      expect(
        domain
          .dayCards(moved.projects, 0)
          .every(
            (row) =>
              Number.isFinite(row.step.dayOrder) &&
              row.step.dayOrder! >= 0 &&
              row.step.dayOrder! <= 1_000_000_000,
          ),
      ).toBe(true);
      expect(moved.projects[0].tasks[0].subtasks[2]).toEqual(
        w.projects[0].tasks[0].subtasks[2],
      );
    }
  });
  it("renormalizes a full destination before appending copied projects", () => {
    const w = fixture();
    for (const row of domain.dayCards(w.projects, 0))
      row.step.dayOrder = 1_000_000_000;
    const incoming: Project[] = [
      {
        id: "new-project",
        name: "New",
        tasks: [
          {
            id: "new-task",
            name: "New",
            note: "",
            done: false,
            subtasks: [step("new-step")],
          },
        ],
      },
    ];
    const appended = domain.appendBoardProjects(w.projects, incoming);
    expect(ids({ ...w, projects: appended }, 0)).toEqual([
      "a",
      "b",
      "c",
      "new-step",
    ]);
    expect(
      domain.dayCards(appended, 0).map((row) => row.step.dayOrder),
    ).toEqual([1024, 2048, 3072, 4096]);
  });
  it.each([0, 1_000_000_000])(
    "accepts a backup rank at the boundary %s",
    (boundary) => {
      const backup = plan(fixture());
      backup.weeks[0].projects[0].tasks[0].subtasks[0].dayOrder = boundary;
      expect(domain.parseBackup(JSON.stringify(backup))).toEqual(backup);
    },
  );
  it("appends new or rescheduled editor steps without changing existing day positions", () => {
    const w = domain.moveBoardCard(fixture(), "c", 0, {
      id: "a",
      edge: "before",
    });
    const next = structuredClone(w.projects);
    next[0].tasks[0].subtasks[2].day = 0;
    next[0].tasks[0].subtasks.push(step("new"));
    const placed = domain.placeEditedTask(w.projects, next, "t-a");
    expect(ids({ ...w, projects: placed }, 0)).toEqual([
      "c",
      "a",
      "b",
      "other",
      "new",
    ]);
  });
  it("preserves copy order and appends incoming cards behind a populated destination", () => {
    const source = domain.moveBoardCard(fixture(), "c", 0, {
      id: "a",
      edge: "before",
    });
    const copied = domain.copyProjects(source.projects, false);
    expect(domain.dayCards(copied, 0).map((row) => row.step.note)).toEqual([
      "c",
      "a",
      "b",
    ]);
    const incoming: Project[] = [
      {
        id: "p-new",
        name: "New",
        tasks: [
          {
            id: "t-new",
            name: "New",
            note: "",
            done: false,
            subtasks: [step("x", 0, 1024)],
          },
        ],
      },
    ];
    const appended = domain.appendBoardProjects(source.projects, incoming);
    expect(ids({ ...source, projects: appended }, 0)).toEqual([
      "c",
      "a",
      "b",
      "x",
    ]);
  });
  it("carries ordered pending cards after existing work and preserves whole-week move order", () => {
    const source = domain.moveBoardCard(fixture(), "c", 0, {
      id: "a",
      edge: "before",
    });
    const target: Week = {
      ...fixture(),
      id: "week_2026-10-12",
      start: "2026-10-12",
      projects: [
        {
          id: "p-target",
          name: "Existing",
          tasks: [
            {
              id: "t-existing",
              name: "Existing",
              note: "",
              done: false,
              subtasks: [step("existing")],
            },
          ],
        },
      ],
    };
    const carried = domain.endWeek(
      { version: 1, weeks: [source, target] },
      source.start,
      true,
    );
    expect(
      domain.dayCards(carried.weeks[1].projects, 0).map((row) => row.step.note),
    ).toEqual(["existing", "c", "a", "b"]);
    expect(
      ids(
        domain.moveWeek(plan(source), source.start, target.start).weeks[0],
        0,
      ),
    ).toEqual(["c", "a", "b"]);
  });
  it("accepts old and new backups, rejects invalid ranks, and deduplicates order-only imports", () => {
    const original = plan(fixture());
    expect(domain.parseBackup(JSON.stringify(original))).toEqual(original);
    const ordered = plan(
      domain.moveBoardCard(original.weeks[0], "c", 0, {
        id: "a",
        edge: "before",
      }),
    );
    expect(domain.parseBackup(JSON.stringify(ordered))).toEqual(ordered);
    expect(domain.mergePlans(ordered, original)).toEqual(ordered);
    for (const invalid of [-1, 1_000_000_001, "bad", null]) {
      const bad = structuredClone(original);
      Object.assign(bad.weeks[0].projects[0].tasks[0].subtasks[0], {
        dayOrder: invalid,
      });
      expect(() => domain.parseBackup(JSON.stringify(bad))).toThrow();
    }
  });
  it("imports all projects together so their interleaved day order survives", () => {
    const source = domain.moveBoardCard(fixture(), "c", 0, {
      id: "a",
      edge: "before",
    });
    const imported = domain.mergePlans({ version: 1, weeks: [] }, plan(source));
    expect(
      domain
        .dayCards(imported.weeks[0].projects, 0)
        .map((row) => row.step.note),
    ).toEqual(["c", "a", "b"]);
  });
  it("keeps legacy board positions when the editor changes subtask structure order", () => {
    const w = fixture();
    const edited = structuredClone(w.projects);
    edited[0].tasks[0].subtasks.reverse();
    const placed = domain.placeEditedTask(w.projects, edited, "t-a");
    expect(ids({ ...w, projects: placed }, 0)).toEqual(["a", "b", "c"]);
  });
  it("keeps legacy board positions when project/task lists are reordered", () => {
    const w = fixture();
    const rearranged = structuredClone(w.projects).reverse();
    const placed = domain.preserveBoardOrder(w.projects, rearranged);
    expect(placed.map((project) => project.id)).toEqual(["p-b", "p-a"]);
    expect(ids({ ...w, projects: placed }, 0)).toEqual(["a", "b", "c"]);
  });
});
