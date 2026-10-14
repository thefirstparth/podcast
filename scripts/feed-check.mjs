// Checks news sources before they go in the catalogue (config/feeds.json): is the feed alive, how many items and how
// fresh, does it carry summaries, and can its articles actually be read (a paywall or a bot wall makes a source a
// signal at most, never the text the writer uses). Usage:
//   node scripts/feed-check.mjs research/candidates.json [research/results.md]
// The candidates file: [{ "for": "Real Madrid", "name": "...", "url": "<RSS or Atom URL>" }, ...]
import { readFileSync, writeFileSync } from "node:fs";
import { ensureProxy, getText } from "../engine/http.mjs";
import { parseRSS, readCluster } from "../engine/fetch/news.mjs";
ensureProxy();

const [file, out = file.replace(/\.json$/, "-results.md")] = process.argv.slice(2);
const list = JSON.parse(readFileSync(file, "utf8")), now = Date.now();
const rows = [];
const check = async c => {
  const r = { ...c, ok: false, items: 0, newest_h: null, per_day: null, summaries: false, readable: "no", note: "" };
  try {
    const xml = await getText(c.url, { timeout: 15000 });
    const items = parseRSS(xml, { id: "x", name: c.name, kind: "news" });
    r.items = items.length;
    if (!items.length) { r.note = "no items (not a feed?)"; return r; }
    r.ok = true;
    const dates = items.map(i => i.date).filter(Boolean).sort((a, b) => b - a);
    if (dates.length) { r.newest_h = Math.round((now - dates[0]) / 36e5); const span = (dates[0] - dates.at(-1)) / 864e5; r.per_day = span > 0 ? +(dates.length / span).toFixed(1) : null; }
    r.summaries = items.filter(i => i.summary && i.summary.length > 60).length >= Math.min(3, items.length);
    // read the two newest articles: both readable (600+ characters of text) is "yes", one is "partly"
    let good = 0;
    for (const i of items.slice(0, 2)) { const t = await readCluster({ links: [{ source: c.name, url: i.url }] }, 3000).catch(() => null); if (t && t.text.length >= 600) good++; }
    r.readable = good === 2 ? "yes" : good === 1 ? "partly" : "no";
  } catch (e) { r.note = String(e.message || e).slice(0, 80); }
  return r;
};
for (let i = 0; i < list.length; i += 6) rows.push(...await Promise.all(list.slice(i, i + 6).map(check)));
const verdict = r => (!r.ok ? "dead" : r.newest_h > 24 * 7 ? "stale" : r.readable === "yes" ? "text" : r.readable === "partly" ? "text, sometimes" : "signal only");
const L = [`# Feed check, ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, "", "Verdict: **text** = alive, fresh and its articles can be read, so the writer may use them; **signal only** = alive but paywalled or blocked, so it only counts towards how many outlets ran a story; **stale** = nothing in a week; **dead** = no feed.", ""];
for (const g of [...new Set(rows.map(r => r.for))]) {
  L.push(`## ${g}`, "", "| Source | Verdict | Items | Newest | Per day | Summaries | Feed |", "|---|---|---|---|---|---|---|");
  for (const r of rows.filter(r => r.for === g)) L.push(`| ${r.name} | ${verdict(r)}${r.note ? ` (${r.note})` : ""} | ${r.items} | ${r.newest_h == null ? "" : `${r.newest_h} h ago`} | ${r.per_day ?? ""} | ${r.summaries ? "yes" : "no"} | ${r.url} |`);
  L.push("");
}
writeFileSync(out, L.join("\n"));
console.log(`feed-check: ${rows.filter(r => verdict(r) === "text").length} text, ${rows.filter(r => /signal/.test(verdict(r))).length} signal only, ${rows.filter(r => /dead|stale/.test(verdict(r))).length} dead or stale of ${rows.length} -> ${out}`);
