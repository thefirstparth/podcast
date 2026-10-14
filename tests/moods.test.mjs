import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moodOf } from "../engine/moods.mjs";
import { storyOf, stageOf } from "../engine/fetch/football.mjs";

const rules = JSON.parse(readFileSync(new URL("../config/show.json", import.meta.url))).mood_rules;
const f = o => ({ won: false, lost: false, drew: false, big: false, close: false, stage: "league", ...o });

test("a loved side's results", () => {
  assert.equal(moodOf(f({ won: true, came_from_behind: true }), "love", rules), "elated");
  assert.equal(moodOf(f({ won: true, close: true, conceded_late: true }), "love", rules), "relieved");
  assert.equal(moodOf(f({ won: true }), "love", rules), "happy");
  assert.equal(moodOf(f({ won: true, podium: true, stage: "race" }), "love", rules), "elated");
  assert.equal(moodOf(f({ podium: true, stage: "race" }), "love", rules), "happy");
  assert.equal(moodOf(f({ lost: true, close: true }), "love", rules), "gutted");
  assert.equal(moodOf(f({ lost: true, big: true }), "love", rules), "angry");
  assert.equal(moodOf(f({ lost: true, lead_lost: true }), "love", rules), "angry");
  assert.equal(moodOf(f({ drew: true, lead_lost: true }), "love", rules), "frustrated");
  assert.equal(moodOf(f({ won: true, stage: "final", title: true }), "love", rules), "elated");
  assert.equal(moodOf(f({ lost: true, eliminated: true }), "love", rules), "gutted");
});

test("a rival is only ever mentioned when it goes wrong for them", () => {
  assert.equal(moodOf(f({ won: true }), "rival", rules), null);
  assert.equal(moodOf(f({ won: true, big: true }), "rival", rules), null);
  assert.equal(moodOf(f({ drew: true }), "rival", rules), "smug");
  assert.equal(moodOf(f({ lost: true }), "rival", rules), "gleeful");
});

test("a match told by its goals: 1-3 down at Roma, won 4-3 (14 Oct 2026)", () => {
  const g = (min, team, who) => ({ type: { text: "Goal" }, clock: { displayValue: min }, team: { id: team }, participants: [{ athlete: { displayName: who } }] });
  const s = storyOf([g("20'", 104, "de Roon"), g("25'", 86, "Mbappé"), g("51'", 104, "Malen"), g("57'", 104, "Malen"), g("83'", 86, "Espí"), g("85'", 86, "Endrick"), g("90'", 86, "Rüdiger")], 86);
  assert.equal(s.trailed, true);
  assert.equal(s.decider.scorer, "Rüdiger");
  assert.equal(s.goals.at(-1).score, "4-3");
});

test("stages", () => {
  assert.equal(stageOf("2026-27 UEFA Champions League, League Phase"), "league");
  assert.equal(stageOf("Round of 16 - 2nd Leg"), "knockout");
  assert.equal(stageOf("Final"), "final");
  assert.equal(stageOf("Club Friendly"), "friendly");
});
