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
