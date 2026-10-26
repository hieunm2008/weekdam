import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  savePlan,
  loadPlan,
  saveAccount,
  loadAccount,
  acknowledge,
} from "./storage";
import { clone, emptyPlan, type Plan } from "./domain";

function guestProject(plan: Plan, name: string): Plan {
  const next = clone(plan);
  if (!next.weeks.length)
    next.weeks.push({
      id: "week_2026-10-05",
      start: "2026-10-05",
      ended: false,
      projects: [],
    });
  next.weeks[0].projects.push({ id: name, name, tasks: [] });
  return next;
}

it("keeps projects added by another Guest tab when a stale snapshot saves", async () => {
  const key = "guest:stale-projects";
  const before = emptyPlan();
  await savePlan(key, guestProject(before, "A"), before);
  await savePlan(key, guestProject(before, "B"), before);
  expect((await loadPlan(key)).weeks[0].projects.map((p) => p.name)).toEqual([
    "A",
    "B",
  ]);
});

it("serializes simultaneous Guest additions without dropping either project", async () => {
  const key = "guest:simultaneous-projects";
  const before = emptyPlan();
  await Promise.all([
    savePlan(key, guestProject(before, "A"), before),
    savePlan(key, guestProject(before, "B"), before),
  ]);
  expect(
    (await loadPlan(key)).weeks[0].projects.map((p) => p.name).sort(),
  ).toEqual(["A", "B"]);
});

it("applies a Guest deletion without undoing a different tab's project edit", async () => {
  const key = "guest:delete-and-edit";
  const before = guestProject(guestProject(emptyPlan(), "A"), "B");
  await savePlan(key, before);
  const renamed = clone(before);
  renamed.weeks[0].projects[1].name = "B edited";
  await savePlan(key, renamed, before);
  const removed = clone(before);
  removed.weeks[0].projects.shift();
  await savePlan(key, removed, before);
  expect((await loadPlan(key)).weeks[0].projects.map((p) => p.name)).toEqual([
    "B edited",
  ]);
});

it("keeps a shared week when a stale removal would orphan another tab's project", async () => {
  const key = "guest:shared-week-deletion";
  const before = guestProject(emptyPlan(), "A");
  await savePlan(key, before);
  await savePlan(key, guestProject(before, "B"), before);
  await savePlan(key, emptyPlan(), before);
  expect((await loadPlan(key)).weeks[0]?.projects.map((p) => p.name)).toEqual([
    "B",
  ]);
});

it("persists the Guest plan separately from each account", async () => {
  const local = { version: 1 as const, weeks: [] };
  const cloud = {
    version: 1 as const,
    weeks: [{ id: "w", start: "2026-10-05", ended: false, projects: [] }],
  };
  await savePlan("guest", local);
  await savePlan("uid1", cloud);
  expect(await loadPlan("guest")).toEqual(local);
  expect(await loadPlan("uid1")).toEqual(cloud);
  expect(await loadPlan("uid2")).toEqual({ version: 1, weeks: [] });
});
it("keeps newer equal-valued edits pending when an older cloud acknowledgement arrives", async () => {
  const record = {
    id: "p",
    kind: "project" as const,
    parent: "week",
    order: 0,
    deleted: false,
    value: { id: "p", name: "Study" },
  };
  const old = { revision: "old", record },
    recent = { revision: "recent", record };
  await saveAccount(
    "account:demo:owner",
    { version: 1, weeks: [] },
    [old],
    true,
  );
  await saveAccount("account:demo:owner", { version: 1, weeks: [] }, [recent]);
  await acknowledge("account:demo:owner", [old]);
  const stored = await loadAccount("account:demo:owner");
  expect(stored.pending).toEqual([recent]);
  expect(stored.migrated).toBe(true);
  await acknowledge("account:demo:owner", [recent]);
  expect((await loadAccount("account:demo:owner")).pending).toEqual([]);
});
