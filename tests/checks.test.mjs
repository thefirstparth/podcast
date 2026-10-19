import test from "node:test";
import assert from "node:assert/strict";
import { checkScript } from "../engine/checks.mjs";

const pack = { words: 200, max_words: 400, items: [{ id: "a", line: "AS Roma 3-4 Real Madrid", goals: ["90' Real Madrid: Antonio Rüdiger"] }], running_order: [{ id: "cold-open" }, { id: "die-hard" }, { id: "signoff" }] };
const t = (segment, speaker, mood, text) => ({ segment, speaker, mood, text });
const base = [t("cold-open", "Fan", "elated", "Madrid were three one down at Roma. They won."), t("cold-open", "Anchor", "happy", "Hello and welcome."),
  ...Array.from({ length: 6 }, () => t("die-hard", "Fan", "elated", "Rüdiger in the ninetieth minute. Four three to Madrid. I had given up on that one, honestly, and then it happened.")),
  t("signoff", "Anchor", "warm", "That's the show. Same time tomorrow.")];
const rivals = [{ name: "Barcelona", aliases: ["Barca"] }];

test("a clean script passes", () => assert.deepEqual(checkScript(base, pack, { rivals }).filter(p => p.hard), []));
test("a rival outside Rival Watch is never voiced", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "And Barcelona won again, of course.");
  assert.ok(checkScript(s, pack, { rivals }).some(p => p.hard && /Barcelona named/.test(p.msg)));
});
test("no laughing in a gutted moment", () => {
  const s = [...base]; s[4] = t("die-hard", "Fan", "gutted", "Lost by twenty-four runs <laugh>");
  assert.ok(checkScript(s, pack, { rivals }).some(p => p.hard && /laughter/.test(p.msg)));
});
test("the same big word twice, and a written word, go back for a rewrite", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "Stunning. Truly stunning, a pivotal night.");
  const p = checkScript(s, pack, { rivals }).map(x => x.msg).join(" | ");
  assert.match(p, /"stunning" used 2 times/); assert.match(p, /pivotal/);
});
test("a name not in the pack goes back", () => {
  const s = [...base]; s[5] = t("die-hard", "Anchor", "happy", "And Ancelotti would have loved it.");
  assert.match(checkScript(s, pack, { rivals }).map(x => x.msg).join(" | "), /Ancelotti/);
});
test("what is not known is left out, never announced", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "And Alcaraz? No news yet on where he plays next.");
  assert.match(checkScript(s, pack, { rivals }).map(x => x.msg).join(" | "), /not known/);
  const ok = [...base]; ok[3] = t("die-hard", "Fan", "elated", "The decider is on Saturday in Bengaluru. Nothing like a decider.");
  assert.doesNotMatch(checkScript(ok, pack, { rivals }).map(x => x.msg).join(" | "), /not known/);
});
test("a name the writer was not given goes back, even if it is somewhere in the pack", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "And Barcola scored a hat-trick for them.");
  const p = { ...pack, considered: ["Manchester City 2-4 PSG: Barcola hat-trick"], known: JSON.stringify({ items: pack.items }) };
  assert.match(checkScript(s, p, { rivals }).map(x => x.msg).join(" | "), /names not in the pack.*Barcola/);
});
test("a script well past its planned length goes back for a trim", () => {
  const long = [...base, ...Array.from({ length: 4 }, () => t("die-hard", "Anchor", "happy", "Rüdiger in the ninetieth minute. Four three to Madrid. And what a night it was in Rome for everyone there."))];
  assert.match(checkScript(long, { ...pack, words: 120 }, { rivals }).map(x => x.msg).join(" | "), /over the planned 120: trim/);
  assert.doesNotMatch(checkScript(base, pack, { rivals }).map(x => x.msg).join(" | "), /trim/);
});
test("a number the writer was not given goes back", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "Samson made 56 off 20 balls.");
  const p = { ...pack, known: JSON.stringify({ text: "Samson reached his fifty in 20 balls" }) };
  assert.match(checkScript(s, p, { rivals }).map(x => x.msg).join(" | "), /numbers not in the pack.*56/);
});
test("a time said differently from the one given goes back", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "elated", "Madrid play Sevilla on Monday morning at 12:30 PM.");
  const p = { ...pack, known: JSON.stringify({ when: "late Sunday night, 12:30 am" }) };
  assert.match(checkScript(s, p, { rivals }).map(x => x.msg).join(" | "), /times not as given.*12:30 pm/);
  const ok = [...base]; ok[3] = t("die-hard", "Fan", "elated", "Madrid and Sevilla, late Sunday night, 12:30 am.");
  assert.doesNotMatch(checkScript(ok, p, { rivals }).map(x => x.msg).join(" | "), /times not as given/);
});
test("an old result told again as news goes back", () => {
  const s = [...base]; s[3] = t("die-hard", "Fan", "gutted", "Then tennis served up a shocker. Alcaraz crashed out to Zizou Bergs, losing 7-5, 7-6.");
  const p = { ...pack, old_news: ["2026-10-13: Carlos Alcaraz, Rolex Shanghai Masters, Round of 32: Zizou Bergs bt Carlos Alcaraz 7-5 7-6"] };
  assert.match(checkScript(s, p, { rivals }).map(x => x.msg).join(" | "), /tells old news again/);
  assert.doesNotMatch(checkScript(base, p, { rivals }).map(x => x.msg).join(" | "), /tells old news again/);
});
test("code takes out a line that tells an old result, whatever the writer did", async () => {
  const { oldNewsTurns } = await import("../engine/checks.mjs");
  const p = { old_news: ["2026-10-15: AS Roma 3-4 Real Madrid"], old_marks: { "Carlos Alcaraz": ["Bergs", "@Shanghai"] } };
  const turns = [
    t("die-hard", "Fan", "elated", "What a night in Rome, 4-3 to Real Madrid against Roma."),   // the told score, again
    t("die-hard", "Anchor", "gutted", "Alcaraz crashed out in Shanghai, losing to Bergs."),       // an earlier result
    t("follow", "Anchor", "happy", "Jodar beat Medvedev to reach the Shanghai final."),          // today's news from the same event
    t("ahead", "Anchor", "happy", "Madrid and Roma meet again in the spring, 4-3 last time."),   // Coming up is left alone
    t("follow", "Fan", "amazed", "And Jodar stunned Daniil Medvedev 6-3, 6-4!"),                 // an old opponent of someone else's, today's news
  ];
  p.old_marks["Novak Djokovic"] = ["Medvedev"];
  p.old_news.push("2026-10-10: Carlos Alcaraz, Rolex Shanghai Masters, Round 2: Carlos Alcaraz bt Juan Manuel Cerundolo 6-3 6-3");
  assert.deepEqual(oldNewsTurns(turns, p).map(x => x.i), [0, 1]);
});
test("the same fact twice is caught, and a sentence that adds nothing is marked for code to take out", async () => {
  const { repeats } = await import("../engine/checks.mjs");
  const s = [t("cold-open", "Fan", "elated", "Big night."), t("die-hard", "Fan", "worried", "India tour New Zealand next. Two Tests, five ODIs, five T20Is."),
    t("die-hard", "Anchor", "calm", "He is 102 points ahead of George Russell and 111 clear of Lewis Hamilton."),
    t("ahead", "Anchor", "calm", "Here is where things stand. India are gearing up for New Zealand, with five T20Is, five ODIs, and two Tests. Antonelli leads on 340 points, 102 ahead of George Russell, with Lewis Hamilton third."),
    t("ahead", "Fan", "happy", "Thursday afternoon, 12:30 pm sees India play the first T20I against New Zealand.")];
  assert.deepEqual(repeats(s).map(r => [r.i, r.whole]), [[3, true], [3, false]]);
});
test("a red card the match never had is caught unless the line says it was not given", async () => {
  const { redCardTurns } = await import("../engine/checks.mjs");
  const p = { items: [{ line: "Real Madrid 4-1 Sevilla", reds: [] }] };
  assert.equal(redCardTurns([t("die-hard", "Fan", "elated", "Sevilla were demanding a red card after an altercation with Güler.")], p).length, 1);
  assert.equal(redCardTurns([t("die-hard", "Fan", "elated", "Sevilla wanted Güler sent off, but the referee gave nothing.")], p).length, 0);
  assert.equal(redCardTurns([t("die-hard", "Fan", "elated", "Sevilla wanted a red card.")], { items: [{ line: "Real Madrid 4-1 Sevilla", reds: ["70' Sevilla: X"] }] }).length, 0);
});
test("a match told out of order is caught; counts of minutes and quarters are not match minutes", async () => {
  const { minutesOutOfOrder, minutesIn } = await import("../engine/checks.mjs");
  assert.match(minutesOutOfOrder([t("die-hard", "Anchor", "happy", "In the second half, sixty-three minutes in, a penalty."), t("die-hard", "Fan", "happy", "Valverde blocked just before the hour.")]), /58 after 63/);
  assert.deepEqual(minutesIn("Güler on thirty minutes, then the thirty-seventh minute, two minutes later, forty-five minutes left, in the fourth quarter, in the eightieth"), [30, 37, 80]);
});
