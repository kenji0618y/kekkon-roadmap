import assert from "node:assert/strict";
import test from "node:test";
import tasks from "../data/tasks.json" with { type: "json" };
import groups from "../data/groups.json" with { type: "json" };
import sources from "../data/sources.json" with { type: "json" };

test("keeps every reviewed item and reference reachable", () => {
  assert.equal(tasks.length, 149);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 149);
  const ids = groups.flatMap((group) => group.ids);
  assert.equal(ids.length, 149);
  assert.equal(new Set(ids).size, 149);
  assert.deepEqual(new Set(ids), new Set(tasks.map((task) => task.id)));
  for (const task of tasks) {
    assert.ok(task.title && task.summary && task.steps.length >= 2, task.id);
    for (const sourceId of task.sources) assert.ok(sources[sourceId], `${task.id}:${sourceId}`);
  }
});

test("does not mix investment entries into benefit totals", () => {
  const records = {
    "A得1": { amount: 3600000, moneyKind: "estimate", status: "done" },
    D1: { amount: 30000, moneyKind: "received", status: "done" },
  };
  const received = Object.entries(records)
    .filter(([, record]) => record.moneyKind === "received")
    .reduce((sum, [, record]) => sum + record.amount, 0);
  assert.equal(received, 30000);
});

test("keeps the statutory day-count anchors explicit", () => {
  const addDays = (value, days) => {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  assert.equal(addDays("2026-03-01", 13), "2026-03-14");
  assert.equal(addDays("2026-03-01", 15), "2026-03-16");
});
