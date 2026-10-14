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
