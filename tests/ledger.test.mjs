import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { record, load, resultSaid, newsSaid, lastPublished } from "../engine/ledger.mjs";

test("what an episode said is never said again", () => {
  const file = `${mkdtempSync(`${tmpdir()}/ledger-`)}/said.json`;
  const pack = { items: [{ id: "f1-17-race-max_verstappen", reports: [{ headline: "Verstappen wins in Singapore from pole" }] }],
    running_order: [{ id: "die-hard", items: ["f1-17-race-max_verstappen"], news: [{ headline: "Mekies extension vital for Max Verstappen", links: [{ url: "https://x/1" }] }] }] };
  record(pack, { file, published_at: "2026-10-12T07:00:00Z" });
  const L = load(file);
  assert.equal(resultSaid(L, "f1-17-race-max_verstappen"), true);
  assert.equal(newsSaid(L, { headline: "Why Laurent Mekies' Red Bull extension is vital for Max Verstappen", links: [] }), true);
  assert.equal(newsSaid(L, { headline: "Verstappen to race GT3 at Portimao against Rossi", links: [] }), false);
  assert.equal(lastPublished(L), Date.parse("2026-10-12T07:00:00Z"));
});
