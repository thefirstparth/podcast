import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { record, load, resultSaid, newsSaid, lastPublished, lastCalls } from "../engine/ledger.mjs";

test("a told result is not told again; only the very same article counts as a repeat", () => {
  const file = `${mkdtempSync(`${tmpdir()}/ledger-`)}/said.json`;
  const pack = { items: [], running_order: [{ id: "die-hard", items: ["f1-17-race-max_verstappen"], news: [{ headline: "Mekies extension vital for Max Verstappen", links: [{ url: "https://x/1" }] }] }] };
  record(pack, { file, published_at: new Date().toISOString() });
  const L = load(file);
  assert.equal(resultSaid(L, "f1-17-race-max_verstappen"), true);
  assert.equal(newsSaid(L, { headline: "Mekies extension vital for Max Verstappen", links: [{ url: "https://x/1" }] }), true);
  // the same story from another outlet, or a follow-up, is not blocked: better twice than missed
  assert.equal(newsSaid(L, { headline: "Why Laurent Mekies' Red Bull extension is vital for Max Verstappen", links: [{ url: "https://y/2" }] }), false);
  assert.ok(lastPublished(L));
});

test("the Fan's calls are claims, never questions", () => {
  const file = `${mkdtempSync(`${tmpdir()}/ledger-`)}/said.json`;
  const turns = [{ speaker: "Kylo", segment: "ahead", text: "What is on our calendar for the next few days?" }, { speaker: "Kylo", segment: "ahead", text: "India will win the decider on Saturday, mark my words." }];
  record({ items: [], running_order: [] }, { file, turns, fan: "Kylo" });
  assert.deepEqual(lastCalls(load(file)), ["India will win the decider on Saturday, mark my words."]);
});
