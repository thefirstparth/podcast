// The day's data pack: everything the episode may say, fetched by code for the listener's profile, each item with
// the listener's stance, the mood the rules give it and its weight, then put in running order with a word budget.
// The writer gets this and nothing else. Nothing here uses an AI.
//   node engine/pack.mjs [--days=3] [--out=rehearsals/YYYY-MM-DD]
// Writes pack.json (for the writer) and pack.md (for a person to check against what really happened).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ensureProxy } from "./http.mjs";
import * as football from "./fetch/football.mjs";
import * as nba from "./fetch/nba.mjs";
import * as f1 from "./fetch/f1.mjs";
import * as tennis from "./fetch/tennis.mjs";
import * as cricket from "./fetch/cricket.mjs";
import * as news from "./fetch/news.mjs";
import { moodOf, intensityOf } from "./moods.mjs";

const H = new URL("../", import.meta.url).pathname;
const json = p => JSON.parse(readFileSync(`${H}${p}`, "utf8"));

export async function buildPack({ profile = json("profile.json"), show = json("config/show.json"), feeds = json("config/feeds.json"), now = Date.now(), hours } = {}) {
  const TZ = profile.listener?.tz || "UTC";
  const since = now - (hours ?? show.window_hours ?? 30) * 36e5, until = now + 7 * 864e5, W = { since, until };
  const items = [], fixtures = [], suppressed = [], errors = [];
  const at = (t, o = {}) => new Date(t).toLocaleString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, ...o });
  const care = f => f.care || "follow";
  const weight = f => show.care_weight?.[care(f)] ?? 1;
  // how much a result matters, before the listener's care
  const stake = x => (x.title ? 2.2 : x.stage === "final" ? 2 : x.stage === "knockout" ? 1.5 : x.stage === "round" ? 1.1 : x.preseason || x.stage === "friendly" ? 0.35 : 1) + (x.big || x.came_from_behind || x.lead_lost || x.late_decider || x.upset ? 0.3 : 0);
  // an item from before the last day's episode would have had its turn already: it counts for less (rehearsals over
  // several days only)
  const fresh = t => (Date.parse(t) >= now - (show.window_hours ?? 30) * 36e5 ? 1 : 0.5);
  const add = it => {
    it.mood = moodOf(it.facts, it.stance, show.mood_rules);
    if (it.stance === "rival" && !it.mood) { suppressed.push(`${it.subject}: ${it.line} (a rival's good result, never said)`); return; }
    it.intensity = intensityOf(it.care);
    it.score = +(weight({ care: it.care }) * stake(it.facts || {}) * fresh(it.when)).toFixed(2);
    items.push(it);
  };
  const safe = async (what, fn) => { try { return await fn(); } catch (e) { errors.push(`${what}: ${e.message}`); return null; } };

  // ---- football: followed clubs and national sides, rivals, followed players through their teams
  const fbLine = (t, r) => `${r.home ? `${t} ${r.us}-${r.them} ${r.opponent}` : `${r.opponent} ${r.them}-${r.us} ${t}`}${r.shootout ? ` (${r.shootout.us}-${r.shootout.them} on penalties)` : ""}`;
  const fbItem = (f, stance, t, r) => ({
    id: `fb-${r.id}-${stance}`, sport: "football", kind: "result", subject: f.name, stance, care: stance === "rival" ? "rival" : care(f), when: r.date, when_local: at(r.date),
    competition: r.competition, stage: r.stage, line: fbLine(t.name, r), venue: r.venue,
    goals: r.goals.map(g => `${g.minute} ${g.forUs ? f.name : r.opponent}: ${g.scorer}${g.kind && g.kind !== "goal" ? ` (${g.kind})` : ""}${g.assist ? `, assist ${g.assist}` : ""}, ${g.score}`),
    reds: r.reds.map(x => `${x.minute} ${x.forUs ? f.name : r.opponent}: ${x.player}`), facts: r.facts, table: stance === "love" ? tableFor(t) : null, source: "ESPN",
  });
  // the table around a loved side, with every rival's row taken out (a rival top of the league is never said); the
  // gap to the top stays, unnamed
  const rivalIds = new Set((profile.rivals || []).map(r => String(r.espn_id)));
  const tableFor = t => {
    if (!t.table) return null;
    const rows = t.table.rows, me = rows.find(r => r.id === t.id), top = rows[0];
    return { league: t.table.league, position: me?.rank ?? null, points: me?.points ?? null, played: me?.played ?? null, points_off_top: me && top ? top.points - me.points : null,
      rows: rows.filter(r => !rivalIds.has(r.id)).map(r => ({ rank: r.rank, team: r.team, points: r.points })) };
  };
  for (const f of profile.follows.filter(f => f.sport === "football" && f.kind === "team")) {
    const t = await safe(f.name, () => football.team(f, W));
    if (!t) continue;
    for (const r of t.results) add(fbItem(f, "love", t, r));
    for (const x of t.fixtures) fixtures.push({ subject: f.name, care: care(f), when: x.date, when_local: at(x.date), what: `${x.home ? `${f.name} v ${x.opponent}` : `${x.opponent} v ${f.name}`}`, competition: x.competition, venue: x.venue });
  }
  for (const f of (profile.rivals || []).filter(f => f.sport === "football")) {
    const t = await safe(f.name, () => football.team(f, W));
    if (!t) continue;
    for (const r of t.results) add(fbItem(f, "rival", t, r));
  }
  for (const f of profile.follows.filter(f => f.sport === "football" && f.kind === "player")) {
    for (const tm of f.teams || []) {
      const t = await safe(`${f.name} (${tm.name})`, () => football.team({ ...tm, league: null }, W));
      for (const r of t?.results || []) {
        const his = r.goals.filter(g => g.forUs && g.scorer === f.name && g.kind !== "own goal");
        const big = r.stage === "final" || r.facts.title;
        if (!his.length && !big) continue;
        add({ ...fbItem({ ...tm, care: care(f) }, "love", t, r), id: `fb-${r.id}-${f.name}`, subject: f.name, care: care(f), player_note: his.length ? `${f.name} scored ${his.length === 1 ? "once" : his.length + " times"} (${his.map(g => g.minute).join(", ")}) for ${tm.name}` : null });
      }
    }
  }

  // ---- cricket
  for (const f of profile.follows.filter(f => f.sport === "cricket")) {
    const t = await safe(f.name, () => cricket.team(f, W));
    if (!t) continue;
    for (const r of t.results) {
      const s = t.series.find(s => s.name === r.series && s.format === r.format);
      add({ id: `cr-${r.id}`, sport: "cricket", kind: "result", subject: f.name, stance: "love", care: care(f), when: r.start, when_local: at(r.start), competition: r.series, stage: r.facts.stage,
        line: `${r.desc} v ${r.opponent}${r.city ? `, ${r.city}` : ""}: ${r.status}`, scorecard: r.score, series: s ? `${s.format} series: India ${s.won}, ${r.opponent} ${s.lost} after ${s.played} of ${s.total}${s.left.length ? `; next ${s.left[0].desc}, ${at(s.left[0].start)}${s.left[0].city ? `, ${s.left[0].city}` : ""}` : ""}` : null, facts: r.facts, source: "Cricbuzz" });
    }
    for (const x of t.fixtures) fixtures.push({ subject: f.name, care: care(f), when: x.start, when_local: at(x.start), what: `${x.desc} v ${x.opponent}`, competition: x.series, venue: [x.ground, x.city].filter(Boolean).join(", ") });
  }

  // ---- F1: the followed driver's weekend; the season for a follower of the whole sport
  const drivers = profile.follows.filter(f => f.sport === "f1" && f.kind === "driver"), allF1 = profile.follows.find(f => f.sport === "f1" && f.kind === "all");
  if (drivers.length || allF1) {
    const s = await safe("Formula 1", () => f1.season(W));
    for (const ses of s?.sessions || []) {
      const top = ses.order.slice(0, 3).map(x => `${x.pos}. ${x.driver} (${x.team})`).join(", ");
      let done = false;
      for (const d of drivers) {
        const me = f1.driverFacts(ses, d.jolpica_id);
        if (!me) continue;
        done = true;
        add({ id: `f1-${ses.round}-${ses.kind}-${d.jolpica_id}`, sport: "f1", kind: ses.kind === "race" ? "result" : "session", subject: d.name, stance: "love", care: ses.kind === "race" ? care(d) : "follow", when: ses.date, when_local: at(ses.date), competition: ses.race, stage: ses.kind,
          line: `${ses.race} ${ses.kind}: ${d.name} ${me.pos === 1 ? "won" : `P${me.pos}`}${me.grid ? ` from grid P${me.grid}` : ""}${me.status && !/^Finished$/.test(me.status) ? ` (${me.status})` : ""}`, top3: top,
          standings: ses.kind === "race" ? s.table.slice(0, 5).map(x => `${x.pos}. ${x.driver} ${x.points}`).concat(s.table.find(x => x.id === d.jolpica_id && x.pos > 5) ? [`${s.table.find(x => x.id === d.jolpica_id).pos}. ${d.name} ${s.table.find(x => x.id === d.jolpica_id).points}`] : []) : null,
          facts: { ...me.facts, stage: ses.kind }, source: "Jolpica" });
      }
      if (!done && allF1 && ses.kind === "race") add({ id: `f1-${ses.round}-race`, sport: "f1", kind: "result", subject: "Formula 1", stance: "neutral", care: care(allF1), when: ses.date, when_local: at(ses.date), competition: ses.race, line: `${ses.race}: ${top}`, facts: { stage: "race" }, source: "Jolpica" });
    }
    for (const u of s?.upcoming || []) fixtures.push({ subject: "Formula 1", care: drivers[0] ? care(drivers[0]) : care(allF1), when: u.date, when_local: at(u.date), what: `${u.race}, ${u.kind}`, competition: "Formula 1" });
  }

  // ---- tennis: followed players, then the big matches of the tournaments on now
  const players = profile.follows.filter(f => f.sport === "tennis" && f.kind === "player"), allTennis = profile.follows.find(f => f.sport === "tennis" && f.kind === "all");
  if (players.length || allTennis) {
    const board = await safe("tennis", () => tennis.board("atp")) || [];
    const mine = new Set();
    for (const p of players) {
      const t = tennis.player(board, p.name, W);
      for (const r of t.results) {
        mine.add(r.id);
        add({ id: `tn-${r.id}-${p.name}`, sport: "tennis", kind: "result", subject: p.name, stance: "love", care: care(p), when: r.date, when_local: at(r.date), competition: r.tournament, stage: r.round,
          line: `${r.tournament}, ${r.round}: ${r.note || `${p.name} v ${r.opponent} ${r.score}`}`, facts: r.facts, source: "ESPN" });
      }
      for (const x of t.fixtures) { mine.add(x.id); fixtures.push({ subject: p.name, care: care(p), when: x.date, when_local: at(x.date), what: `${p.name} v ${x.opponent}, ${x.round}`, competition: x.tournament }); }
    }
    if (allTennis) for (const m of tennis.bigMatches(board, W).filter(m => !mine.has(m.id)))
      add({ id: `tn-${m.id}`, sport: "tennis", kind: "result", subject: m.tournament, stance: "neutral", care: care(allTennis), when: m.date, when_local: at(m.date), competition: m.tournament, stage: m.round, line: `${m.tournament}, ${m.round}: ${m.note || m.players.map(p => p.name).join(" v ")}`, facts: { stage: /final$/i.test(m.round) && !/semi/i.test(m.round) ? "final" : "knockout" }, source: "ESPN" });
  }

  // ---- NBA
  for (const f of profile.follows.filter(f => f.sport === "basketball")) {
    const t = await safe(f.name, () => nba.team(f, W));
    for (const g of t?.results || []) add({ id: `nba-${g.id}`, sport: "basketball", kind: "result", subject: f.name, stance: "love", care: care(f), when: g.date, when_local: at(g.date), competition: g.kind, stage: g.kind,
      line: `${g.kind}: ${g.home ? `${f.name} ${g.us}-${g.them} ${g.opponent}` : `${g.opponent} ${g.them}-${g.us} ${f.name}`}`, facts: g.facts, source: "ESPN" });
    for (const x of t?.fixtures || []) fixtures.push({ subject: f.name, care: care(f), when: x.date, when_local: at(x.date), what: `${x.home ? `${f.name} v ${x.opponent}` : `${x.opponent} v ${f.name}`}`, competition: x.kind });
  }

  // ---- news: each followed name's stories, then the wider game. A story that names a rival is never used (its
  // results above are the only way a rival reaches the show).
  const sports = new Set([...profile.follows.map(f => f.sport), ...(profile.rivals || []).map(f => f.sport)]);
  const lang = profile.listener?.language || "en-IN";
  const deskFeeds = [...sports].flatMap(s => feeds[s] || []), names = profile.follows.filter(f => f.kind !== "all");
  const tagged = (list, sport) => list.map(f => ({ ...f, sport }));
  const pool = await safe("news", () => news.feeds([...[...sports].flatMap(s => tagged(feeds[s] || [], s)), ...tagged(feeds.general || [], null), ...names.map(f => news.searchFeed(f.name.replace(/ men$/, " cricket team"), lang, f.sport))], W)) || [];
  const clusters = news.cluster(pool);
  const rx = n => new RegExp(`\\b(${n})\\b`, "i");
  // how a name appears in headlines (the setup page will ask for these; for now, Parth's), and what a match is not
  const ALIAS = { "Real Madrid": "Real Madrid|Madrid(?! Open)(?<!Atl[eé]tico Madrid)|Madridistas?|Bernab[eé]u", "India men": "India(?:'s)? (?:cricket|team|captain|squad|batting|bowling)|Team India|India (?:beat|lose|loses|win|wins|v |vs )|Suryakumar|Gill", "Golden State Warriors": "Warriors|Golden State|Steph Curry|Stephen Curry", "Barcelona": "Barcelona|Bar[cç]a|Camp Nou|Flick" };
  const NOT = { "India men": /\b(women|Mandhana|Harmanpreet|Ranji|U-?19|A team)\b/i };
  const who = f => { const r = rx(ALIAS[f.name] || f.name.split(" ").at(-1)); return { test: h => r.test(h) && !NOT[f.name]?.test(h) }; };
  const rivalRx = (profile.rivals || []).map(who);
  const used = new Set();
  const news_items = [];
  for (const f of names) {
    const cap = { "die-hard": 3, follow: 2, "big-moments": 1 }[care(f)] ?? 1, min = care(f) === "big-moments" ? 2 : 1;
    const mine = clusters.filter(c => who(f).test(c.headline) && c.n >= min && !rivalRx.some(r => r.test(c.headline)) && !used.has(c)).slice(0, cap);
    for (const c of mine) { used.add(c); news_items.push({ subject: f.name, care: care(f), ...c }); }
  }
  // The Wider Pitch (football beyond the listener's own) and The Sidelines (other sport), never a story about anyone
  // the listener follows (it belongs above) or a rival
  const free = c => !used.has(c) && !rivalRx.some(r => r.test(c.headline)) && !names.some(f => who(f).test(c.headline) || new RegExp(`\\b${f.name.split(" ").at(-1)}\\b`, "i").test(c.headline));
  const wide = profile.wider || {}, bar = l => ({ follow: 2, "big-moments": 3 })[l] ?? 99;
  const around = [
    ...clusters.filter(c => free(c) && c.sport === "football" && c.n >= bar(wide.football)).slice(0, 3),
    ...clusters.filter(c => free(c) && !["football", ...sports].includes(c.sport) && c.n >= bar(wide.other_sports)).slice(0, 2),
  ];

  // ---- running order and word budget
  const by = c => items.filter(i => i.kind !== "news" && c(i)).sort((a, b) => b.score - a.score);
  const open = [...items].filter(i => i.kind === "result").sort((a, b) => (b.score * b.intensity) - (a.score * a.intensity))[0] || null;
  const wpm = show.words_per_minute || 164;
  const wordsFor = i => Math.round(40 + 45 * i.score);
  const segs = [
    { id: "cold-open", items: open ? [open.id] : [], words: open ? 35 : 0 },
    { id: "die-hard", items: by(i => i.care === "die-hard").map(i => i.id), news: news_items.filter(n => n.care === "die-hard") },
    { id: "rival-watch", items: by(i => i.stance === "rival").map(i => i.id) },
    { id: "follow", items: by(i => i.stance !== "rival" && i.care !== "die-hard").map(i => i.id), news: news_items.filter(n => n.care !== "die-hard") },
    { id: "around", news: around },
    { id: "ahead", fixtures: fixtures.filter(x => x.care !== "big-moments").sort((a, b) => a.when.localeCompare(b.when)) },
    { id: "signoff", words: 15 },
  ];
  for (const s of segs) if (s.words == null) s.words = (s.items || []).reduce((n, id) => n + wordsFor(items.find(i => i.id === id)), 0) + (s.news || []).length * 35 + (s.fixtures || []).length * 14;
  const live = segs.filter(s => s.words > 0 && ((s.items || []).length || (s.news || []).length || (s.fixtures || []).length || ["signoff"].includes(s.id)));
  let total = live.reduce((n, s) => n + s.words, 0);
  const [lo, hi] = [(profile.length?.min ?? 4) * wpm, (profile.length?.max ?? 10) * wpm];
  // a quiet day stays short (never padded); a big day is squeezed to the listener's longest
  if (total > hi) { const k = hi / total; for (const s of live) s.words = Math.round(s.words * k); total = hi; }
  for (const s of live) { const def = show.segments.find(x => x.id === s.id); Object.assign(s, { name: def?.name, about: def?.about }); }
  return { made_at: new Date(now).toISOString(), tz: TZ, window: { from: new Date(since).toISOString(), to: new Date(now).toISOString() }, listener: profile.listener, tone: profile.tone,
    minutes: +(total / wpm).toFixed(1), words: total, quiet: total < lo, running_order: live, items, fixtures, suppressed, errors };
}

// A person's view of the pack: what happened, the mood code gave it, and where it sits in the show
export function packMarkdown(P) {
  const L = [], it = id => P.items.find(i => i.id === id);
  L.push(`# Data pack, ${new Date(P.made_at).toLocaleString("en-GB", { timeZone: P.tz, dateStyle: "full", timeStyle: "short" })} (${P.tz})`, "");
  L.push(`Window: results since ${new Date(P.window.from).toLocaleString("en-GB", { timeZone: P.tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Planned length: about ${P.minutes} minutes (${P.words} words)${P.quiet ? ", a quiet day, so short" : ""}.`, "");
  for (const s of P.running_order) {
    L.push(`## ${s.name} (about ${s.words} words)`, `_${s.about}_`, "");
    for (const id of s.items || []) {
      const i = it(id);
      L.push(`- **${i.subject}** · ${i.line}`, `  - Mood: **${i.mood}** (stance ${i.stance}, care ${i.care}, weight ${i.score})`, `  - When: ${i.when_local} · ${i.competition || ""}${i.venue ? ` · ${i.venue}` : ""} · source ${i.source}`);
      if (i.goals?.length) L.push(`  - Goals: ${i.goals.join("; ")}`);
      if (i.reds?.length) L.push(`  - Red cards: ${i.reds.join("; ")}`);
      if (i.player_note) L.push(`  - ${i.player_note}`);
      if (i.scorecard) L.push(`  - Scorecard: ${i.scorecard}`);
      if (i.series) L.push(`  - Series: ${i.series}`);
      if (i.top3) L.push(`  - Top three: ${i.top3}`);
      if (i.standings) L.push(`  - Standings: ${i.standings.join(", ")}`);
      if (i.table) L.push(`  - Table: ${i.subject} ${i.table.position}${["th", "st", "nd", "rd"][i.table.position % 10 > 3 || [11, 12, 13].includes(i.table.position % 100) ? 0 : i.table.position % 10]} on ${i.table.points} points after ${i.table.played}, ${i.table.points_off_top} off the top. Rows given to the writer (rivals taken out): ${i.table.rows.map(r => `${r.rank}. ${r.team} ${r.points}`).join(", ")}`);
      const facts = Object.entries(i.facts || {}).filter(([k, v]) => v === true).map(([k]) => k);
      if (facts.length) L.push(`  - Facts the mood used: ${facts.join(", ")}`);
    }
    for (const n of s.news || []) L.push(`- ${n.subject ? `**${n.subject}** · ` : ""}${n.headline} _(${n.outlets.join(", ")})_`);
    for (const x of s.fixtures || []) L.push(`- ${x.when_local} · ${x.what} · ${x.competition || ""}${x.venue ? ` · ${x.venue}` : ""}`);
    if (s.id === "signoff") L.push("- The fixed closing line.");
    L.push("");
  }
  if (P.suppressed.length) L.push("## Left out on purpose", ...P.suppressed.map(x => `- ${x}`), "");
  if (P.errors.length) L.push("## Sources that failed", ...P.errors.map(x => `- ${x}`), "");
  return L.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureProxy();
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
  const days = Number(arg("days")) || null;
  const P = await buildPack({ hours: days ? days * 24 : undefined });
  const day = new Date().toLocaleDateString("en-CA", { timeZone: P.tz });
  const out = `${H}${arg("out") || `rehearsals/${day}`}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/pack.json`, JSON.stringify(P, null, 2));
  writeFileSync(`${out}/pack.md`, packMarkdown(P));
  console.log(`pack: ${P.items.length} items, ${P.fixtures.length} fixtures, about ${P.minutes} min; ${P.errors.length} source errors -> ${out}`);
}
