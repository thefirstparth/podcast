import test from "node:test";
import assert from "node:assert/strict";
import { parseRSS, cluster } from "../engine/fetch/news.mjs";

test("RSS and Atom both parse", () => {
  const rss = `<rss><channel><item><title>Madrid win at Roma</title><link>https://a/1</link><pubDate>Wed, 14 Oct 2026 21:00:00 GMT</pubDate><description>&lt;p&gt;Three late goals&lt;/p&gt;</description></item></channel></rss>`;
  const atom = `<feed><entry><title type="html">Madrid stun Roma late</title><link rel="alternate" href="https://b/2"/><published>2026-10-14T21:10:00Z</published><summary>From 3-1 down</summary></entry></feed>`;
  const a = parseRSS(rss, { id: "x", name: "X", kind: "news" }), b = parseRSS(atom, { id: "y", name: "Managing Madrid", kind: "news" });
  assert.equal(a[0].summary, "Three late goals");
  assert.equal(b[0].url, "https://b/2");
  assert.equal(b[0].date, Date.parse("2026-10-14T21:10:00Z"));
});

test("reports of one story become one cluster, counted by outlet", () => {
  const it = (title, source) => ({ title, source, kind: "news", date: 1 });
  const c = cluster([it("Real Madrid come from 3-1 down to beat Roma", "BBC"), it("Real Madrid come back from 3-1 down to beat Roma 4-3", "Al Jazeera"), it("Alcaraz out in Shanghai", "BBC")]);
  assert.equal(c[0].n, 2);
  assert.equal(c.length, 2);
});

test("players stand for their team in headlines", async () => {
  const { playerAliases } = await import("../engine/pack.mjs");
  assert.deepEqual(playerAliases("Vinícius Júnior"), ["Vinicius Junior", "Vinicius"]);
  assert.deepEqual(playerAliases("Jude Bellingham"), ["Jude Bellingham", "Bellingham"]);
  assert.deepEqual(playerAliases("Draymond Green"), ["Draymond Green", "Draymond"]);
  assert.deepEqual(playerAliases("Brandon Williams"), ["Brandon Williams"]);
  assert.deepEqual(playerAliases("Rodrygo"), ["Rodrygo"]);
});

test("matching by the profile's words: not-phrases are taken out first", async () => {
  const { buildMatcher } = await import("../engine/pack.mjs");
  const madrid = buildMatcher({ name: "Real Madrid", aliases: ["Real Madrid", "Madrid"], not: ["Atletico Madrid", "Madrid Open"] }, ["Vinícius Júnior", "Jude Bellingham"]);
  assert.equal(madrid.test("Atlético Madrid 2-0 Real Madrid"), true);
  assert.equal(madrid.test("Atletico Madrid sign a striker"), false);
  assert.equal(madrid.test("Vinicius Jr to miss Barcelona game because of ban"), true);
  assert.equal(madrid.test("Sinner wins the Madrid Open"), false);
});

test("English only", async () => {
  const { isEnglish } = await import("../engine/fetch/news.mjs");
  assert.equal(isEnglish("Real Madrid come from 3-1 down to beat Roma"), true);
  assert.equal(isEnglish("La remontada del Real Madrid en el Olímpico"), false);
  assert.equal(isEnglish("Vinicius será baja en el Clásico"), false);
  assert.equal(isEnglish("Mbappé, Bellingham and Vinicius start"), true);
});

test("one story in many words is still one story (Six Kings Slam, 15 Oct)", async () => {
  const { cluster } = await import("../engine/fetch/news.mjs");
  const it = (title, source) => ({ title, source, kind: "news", date: 1 });
  const filler = Array.from({ length: 30 }, (_, k) => it(`Unrelated match report number ${k} about football and cricket`, `X${k}`));
  const c = cluster([...filler,
    it("Six Kings Slam postponed to December, clashes with 2027 season", "Tennis Majors"),
    it("Six Kings Slam featuring Carlos Alcaraz and Novak Djokovic postponed after deadly Saudi Arabia attacks", "BBC"),
    it("Carlos Alcaraz’s schedule complaints to be tested as Six Kings Slam postponed", "Tennis365")]);
  const six = c.find(x => /six kings/i.test(x.headline));
  assert.equal(six.n, 3);
  assert.ok(six.titles.some(t => /Alcaraz/.test(t)));
});

test("a skip word rules the whole story out (women's cricket is not India men, 15 Oct)", async () => {
  const { buildMatcher } = await import("../engine/pack.mjs");
  const india = buildMatcher({ name: "India men", aliases: ["India"], skip: ["women", "Mandhana"] });
  assert.equal(india.test("'There are a few things we need to work on': Mandhana flags India's T20I improvement areas"), false);
  assert.equal(india.skips("Smriti Mandhana set for new chapter as India captain"), true);
  assert.equal(india.test("Shai Hope's 102 gives West Indies series-levelling win over India"), true);
});

test("one story in pieces is told once; a shared name or competition never joins two stories", async () => {
  const { storyIndex, sameStory } = await import("../engine/fetch/news.mjs");
  const c = (...titles) => ({ titles });
  const sixA = c("Six Kings Slam 2026 postponed to December amid Houthi attacks on Saudi Arabia", "Saudi tennis 'slam' with Alcaraz, Djokovic postponed amid Houthi attacks");
  const sixB = c("Six Kings Slam postponed to December, clashes with 2027 season", "Carlos Alcaraz's schedule complaints to be tested as Six Kings Slam postponed");
  const sixC = c("Six Kings Slam exhibition event postponed for 'logistical reasons' amid Riyadh airstrikes", "Six Kings Slam postponed amid Riyadh security concerns as Alcaraz and Djokovic affected");
  const gpA = c("Tom Hart to stand in as Max Verstappen's race engineer at the United States Grand Prix");
  const gpB = c("Lando Norris eyes the title at the United States Grand Prix");
  const clA = c("Kane threatens a Champions League record of Cristiano Ronaldo"), clB = c("What to watch in the UEFA Champions League: all eyes on City");
  const all = [sixA, sixB, sixC, gpA, gpB, clA, clB];
  const ix = storyIndex(all, ["Carlos Alcaraz", "Novak Djokovic", "Max Verstappen", "Cristiano Ronaldo"]);
  assert.equal(sameStory(sixA, sixB, ix), true);
  assert.equal(sameStory(sixA, sixC, ix), true);
  assert.equal(sameStory(gpA, gpB, ix), false);
  assert.equal(sameStory(clA, clB, ix), false);
});
