import test from "node:test";
import assert from "node:assert/strict";
import { isLocked, locationLabel, record } from "../src/predictions.js";

test("record counts wins and losses", () => {
  assert.deepEqual(record(new Map([["a", "W"], ["b", "L"], ["c", "W"]])), { wins: 2, losses: 1 });
});

test("game locks at kickoff", () => {
  const game = { id: "a", opponent: "A", location: "home" as const, lockAt: "2026-09-05T12:00:00-04:00" };
  assert.equal(isLocked(game, new Date("2026-09-05T15:59:59Z")), false);
  assert.equal(isLocked(game, new Date("2026-09-05T16:00:00Z")), true);
});

test("location labels are readable", () => {
  assert.equal(locationLabel({ id: "a", opponent: "Ohio State", location: "away", lockAt: null }), "at Ohio State");
});
