// The daily episode, start to finish: the pack (code), the script (Gemini, checked by code), the voices (Gemini,
// each cut heard by the listening check), the two-mic mix (the 14:00 show's studio), the MP3 and its transcript, then,
// in live mode only, the episode on GitHub Releases, the feed, and the memory of what was said.
//   node engine/episode.mjs --mode=test   the rehearsal key; nothing published; the MP3 kept as a run artifact
//   node engine/episode.mjs --mode=live   the live key; published (switched on only after Parth and Claude agree)
// No backup voice (Parth, 16 Oct): if Gemini cannot write or voice it, there is no episode that day, the run fails,
// and the run's summary tells the listener how to reach Parth. The next episode starts from the last one published.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { ensureProxy } from "./http.mjs";
import { buildPack, packMarkdown } from "./pack.mjs";
import { writeScript, scriptMarkdown } from "./writer.mjs";
import { voiceScript } from "./voice.mjs";
import { layout, mix } from "./audio/studio.mjs";
import { vttOf } from "./audio/lib.mjs";
import * as ledger from "./ledger.mjs";

const H = new URL("../", import.meta.url).pathname, json = p => JSON.parse(readFileSync(`${H}${p}`, "utf8"));
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
const MODE = arg("mode") || "test", LIVE = MODE === "live";
const log = (...a) => console.log("episode:", ...a);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The run's summary page (GitHub shows it on the run): what happened, and on a failure, how to reach Parth
function summary(md) { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`); }
function nudge(why, show) {
  const repo = process.env.GITHUB_REPOSITORY || "thefirstparth/podcast", run = `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || ""}`;
  const title = encodeURIComponent(`Today's episode could not be made`), body = encodeURIComponent(`What happened: ${why}\nThe run: ${run}`);
  summary(`## No episode today\n${why}\n\nThe next episode will catch up on everything since the last one. Please tell Parth, so he can look at it:\n- [Open a pre-filled note on GitHub](https://github.com/thefirstparth/podcast/issues/new?title=${title}&body=${body}) (GitHub emails him)\n- [Or email him](mailto:${show.owner?.email || ""}?subject=${title}&body=${body})\n`);
}

// The site's front page: the cover, what the show is, and the feed link to paste into a podcast app (not indexed)
export function siteHTML({ show, base, image }) {
  const title = show.title || "Sports show", feed = `${base}/feed.xml`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{font:17px/1.55 system-ui,sans-serif;max-width:34rem;margin:2.5rem auto;padding:0 1rem;color:#1d1f1e;background:#fbfaf7}img{width:100%;max-width:22rem;border-radius:12px;display:block;margin:0 0 1.5rem}code{display:block;padding:.8rem;border-radius:8px;background:#ecebe6;word-break:break-all;font-size:15px}@media(prefers-color-scheme:dark){body{color:#ecebe6;background:#111312}code{background:#222524}}</style></head>
<body>${image ? `<img src="${esc(image)}" alt="${esc(title)} cover">` : ""}<h1>${esc(title)}</h1><p>${esc(show.description || "")}</p>
<p>To listen, add this link in your podcast app (Apple Podcasts: Library, then Follow a Show by URL):</p><code>${esc(feed)}</code></body></html>
`;
}

// The feed: every kept episode, newest first (episodes are GitHub Releases tagged ep-YYYY-MM-DD; the release text
// carries the episode's record as JSON)
export function feedXML({ show, base, episodes, image }) {
  const O = show.owner || {}, title = show.title || "Sports show";
  const items = episodes.map(e => `  <item>
    <title>${esc(e.title)}</title>
    <description>${esc(e.description)}</description>
    <enclosure url="${esc(e.url)}" length="${e.bytes}" type="audio/mpeg"/>${e.transcript ? `\n    <podcast:transcript url="${esc(e.transcript)}" type="text/vtt" language="en"/>` : ""}
    <guid isPermaLink="false">sports-${e.date}</guid>
    <pubDate>${new Date(e.published).toUTCString()}</pubDate>
    <itunes:duration>${Math.round(e.seconds)}</itunes:duration>
    <itunes:explicit>false</itunes:explicit>
  </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
<channel>
  <title>${esc(title)}</title>
  <link>${esc(base)}</link>
  <description>${esc(show.description || "")}</description>
  <language>en-in</language>
  <itunes:author>${esc(O.name || "")}</itunes:author>
  <itunes:owner><itunes:name>${esc(O.name || "")}</itunes:name><itunes:email>${esc(O.email || "")}</itunes:email></itunes:owner>
  <itunes:block>Yes</itunes:block>
  <itunes:category text="Sports"/>
  <itunes:explicit>false</itunes:explicit>${image ? `\n  <itunes:image href="${esc(image)}"/>` : ""}
${items}
</channel>
</rss>
`;
}

async function gh(path, opt = {}) {
  const r = await fetch(path.startsWith("http") ? path : `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, { ...opt, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${path}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

async function main() {
  const show = json("config/show.json"), voices = json("config/voices.json"), profile = json("profile.json");
  const key = LIVE ? process.env.GEMINI_KEY_LIVE : process.env.GEMINI_KEY_REHEARSAL;
  if (!key) throw new Error(`${LIVE ? "GEMINI_KEY_LIVE" : "GEMINI_KEY_REHEARSAL"} is not set`);
  const now = Date.now(), day = new Date(now).toLocaleDateString("en-CA", { timeZone: profile.listener?.tz || "Asia/Kolkata" });
  const out = `${H}.out/${day}`; mkdirSync(out, { recursive: true });
  if (LIVE) {
    const done = await gh(`/releases/tags/ep-${day}`).catch(() => null);
    if (done && !process.argv.includes("--force")) { log(`today's episode (${day}) is already published`); summary(`Today's episode (${day}) was already published.`); return; }
  }
  // 1. the pack
  const P = await buildPack({ now });
  writeFileSync(`${out}/pack.json`, JSON.stringify(P, null, 2)); writeFileSync(`${out}/pack.md`, packMarkdown(P));
  log(`pack: ${P.items.length} items, about ${P.minutes} minutes; ${P.errors.length} source errors`);
  // 2. the script
  const caps = show.live_requests || { writer: 4, voice: 6 };
  const save = r => { writeFileSync(`${out}/script.json`, JSON.stringify(r, null, 2)); writeFileSync(`${out}/script.md`, scriptMarkdown(r, P)); };
  const r = await writeScript(P, { key, show, profile, cap: LIVE ? caps.writer : show.rehearsal_requests ?? 3, onTry: save });
  save(r);
  if (!r.best) throw new Error(`no script passed the checks after ${r.requests} request(s)`);
  const turns = r.best.turns;
  log(`script: ${r.best.model}, ${turns.length} turns`);
  // 3. the voices
  const v = await voiceScript(turns, { key, show, voices, out, log, cap: caps.voice });
  // 4. the studio: two mics when each line is its own piece; the transcript from the studio's own timing
  const L = layout({ turns, pieces: v.pieces || null, take: v.take || null, date: day, pan: show.pan || {}, music: false });
  const mp3 = `${out}/episode.mp3`; mix(L, out, mp3);
  const vtt = L.cues ? vttOf(turns, L.cues) : null;
  if (vtt) writeFileSync(`${out}/episode.vtt`, vtt);
  const seconds = Math.round(L.seconds), bytes = statSync(mp3).size;
  log(`studio: ${v.form}, ${Math.floor(seconds / 60)} min ${seconds % 60} s, ${Math.round(bytes / 1024)} KB`);
  // the record of the episode: a title and description from the facts (code, not the writer)
  const open = P.items.find(i => P.running_order[0]?.items?.includes(i.id)) || P.items[0];
  const dateLabel = new Date(now).toLocaleDateString("en-GB", { timeZone: profile.listener?.tz || "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
  const meta = { date: day, published: new Date().toISOString(), seconds, bytes, title: `${dateLabel}: ${open ? open.line : "the day in sport"}`,
    description: P.running_order.flatMap(s => (s.items || []).map(id => P.items.find(i => i.id === id)?.line)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 8).join(". "),
    writer: r.best.model, voice: v.model, form: v.form };
  writeFileSync(`${out}/episode.json`, JSON.stringify(meta, null, 2));
  summary(`## ${meta.title}\n${Math.floor(seconds / 60)} min ${seconds % 60} s. Script by ${meta.writer}; voices by ${meta.voice} (${v.form}). ${LIVE ? "Published." : "Test run: nothing published; the MP3 is in the run's artifacts."}`);
  if (!LIVE) return;
  // 5. live: the release (MP3 and transcript), the feed for the Pages site, the memory of what was said
  const rel = await gh(`/releases`, { method: "POST", body: JSON.stringify({ tag_name: `ep-${day}`, name: meta.title, body: "```json\n" + JSON.stringify(meta, null, 1) + "\n```" }) });
  const up = async (file, name, type) => gh(`${rel.upload_url.replace(/\{.*$/, "")}?name=${name}`, { method: "POST", headers: { "content-type": type }, body: readFileSync(file) });
  const a = await up(mp3, `episode-${day}.mp3`, "audio/mpeg"), t = vtt ? await up(`${out}/episode.vtt`, `episode-${day}.vtt`, "text/vtt") : null;
  log(`published: ${a.browser_download_url}`);
  const all = (await gh(`/releases?per_page=100`)).filter(x => /^ep-\d{4}-\d{2}-\d{2}$/.test(x.tag_name)).sort((x, y) => y.tag_name.localeCompare(x.tag_name));
  for (const old of all.slice(show.keep_episodes || 30)) { await gh(`/releases/${old.id}`, { method: "DELETE" }).catch(() => {}); await gh(`/git/refs/tags/${old.tag_name}`, { method: "DELETE" }).catch(() => {}); }
  const episodes = all.slice(0, show.keep_episodes || 30).map(x => {
    let m = {}; try { m = JSON.parse(String(x.body).replace(/^```json\n|\n```$/g, "")); } catch {}
    const mp = x.assets.find(s => s.name.endsWith(".mp3")), tv = x.assets.find(s => s.name.endsWith(".vtt"));
    return mp ? { ...m, date: x.tag_name.slice(3), url: mp.browser_download_url, bytes: mp.size, transcript: tv?.browser_download_url, published: m.published || x.published_at, title: m.title || x.name, description: m.description || "", seconds: m.seconds || 0 } : null;
  }).filter(Boolean);
  const [owner, name] = process.env.GITHUB_REPOSITORY.split("/"), base = `https://${owner}.github.io/${name}`;
  mkdirSync(`${H}.out/site`, { recursive: true });
  const image = existsSync(`${H}cover.jpg`) ? `${base}/cover.jpg` : null;
  writeFileSync(`${H}.out/site/feed.xml`, feedXML({ show, base, episodes, image }));
  writeFileSync(`${H}.out/site/index.html`, siteHTML({ show, base, image }));
  writeFileSync(`${H}.out/site/.nojekyll`, "");
  ledger.record(P, { published_at: meta.published, turns, fan: show.hosts.find(h => h.role === "fan")?.id });
  log(`feed: ${episodes.length} episode(s) -> ${base}/feed.xml`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureProxy();
  main().catch(e => {
    console.error("episode: failed:", e.message);
    try { nudge(e.message, json("config/show.json")); } catch {}
    process.exit(1);
  });
}
