import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { record, load, resultSaid, newsSaid, lastPublished } from "../engine/ledger.mjs";

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
