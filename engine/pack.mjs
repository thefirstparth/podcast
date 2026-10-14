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
import * as elsewhere from "./fetch/elsewhere.mjs";
import { moodOf, intensityOf } from "./moods.mjs";
import * as ledger from "./ledger.mjs";

const H = new URL("../", import.meta.url).pathname;

// The ways a player is named in headlines: the full name, a one-word name (Rodrygo, Endrick), and a surname of six or
// more letters that is not an everyday word or a common surname (Bellingham, Porzingis; not Green, Silva, Santos)
const COMMON = new Set("junior jr ii iii silva santos martinez garcia rodriguez fernandez lopez gonzalez perez sanchez diaz gomez navarro rivas green williams moody butler richard terry burton payton melton bassey brandon jimmy martin johnson james jones smith brown davis wilson miller".split(" "));
const fold = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const esc = t => fold(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[- ]/g, "[- ]");
// Does a headline name this subject? Its profile words and its squad, after the profile's "not" phrases are taken out
export function buildMatcher(f, squad = []) {
  const words = [...(f.aliases?.length ? f.aliases : [f.name]), ...squad.flatMap(playerAliases)];
  const yes = new RegExp(`\\b(${words.map(esc).join("|")})\\b`, "i"), no = (f.not || []).length ? new RegExp(`\\b(${f.not.map(esc).join("|")})\\b`, "gi") : null;
  return { test: h => yes.test(no ? fold(h).replace(no, " ") : fold(h)) };
}
export function playerAliases(name) {
  const f = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z' -]/g, "").trim(), w = f.split(/\s+/);
  const out = [f.replace(/[-]/g, "[- ]")];
  if (w.length === 1 && w[0].length >= 5) return out;
  const last = w.at(-1).toLowerCase();
  if (last.length >= 6 && !COMMON.has(last)) out.push(w.at(-1));
  else if (COMMON.has(last) && w[0].length >= 6 && !COMMON.has(w[0].toLowerCase())) out.push(w[0]);
  return [...new Set(out)];
}
const json = p => JSON.parse(readFileSync(`${H}${p}`, "utf8"));

export async function buildPack({ profile = json("profile.json"), show = json("config/show.json"), feeds = json("config/feeds.json"), now = Date.now(), hours, said = ledger.load() } = {}) {
  const TZ = profile.listener?.tz || "UTC";
  // from the last published episode (a missed day is caught up, four days at most); else the last window_hours
  const last = ledger.lastPublished(said);
  const since = hours ? now - hours * 36e5 : last ? Math.max(last - 3 * 36e5, now - 4 * 864e5) : now - (show.window_hours ?? 30) * 36e5, until = now + 7 * 864e5, W = { since, until };
  const items = [], fixtures = [], suppressed = [], errors = [], already = [];
  const at = (t, o = {}) => new Date(t).toLocaleString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, ...o });
  const care = f => f.care || "follow";
  const weight = f => show.care_weight?.[care(f)] ?? 1;
  // how much a result matters, before the listener's care
  const stake = x => (x.title ? 2.2 : x.stage === "final" ? 2 : x.stage === "knockout" ? 1.5 : x.stage === "round" ? 1.1 : x.preseason || x.stage === "friendly" ? 0.35 : 1) + (x.big || x.came_from_behind || x.lead_lost || x.late_decider || x.upset ? 0.3 : 0);
  // an item from before the last day's episode would have had its turn already: it counts for less (rehearsals over
  // several days only)
  const fresh = t => (Date.parse(t) >= now - (show.window_hours ?? 30) * 36e5 ? 1 : 0.5);
  const add = it => {
    if (ledger.resultSaid(said, it.id)) { already.push(`${it.subject}: ${it.line}`); return; }
    it.mood = moodOf(it.facts, it.stance, show.mood_rules);
    if (it.stance === "rival" && !it.mood) { suppressed.push(`${it.subject}: ${it.line} (a rival's good result, never said)`); return; }
    it.intensity = intensityOf(it.care, it.facts || {});
    it.score = +(weight({ care: it.care }) * stake(it.facts || {}) * fresh(it.when)).toFixed(2);
    items.push(it);
  };
  const safe = async (what, fn) => { try { return await fn(); } catch (e) { errors.push(`${what}: ${e.message}`); return null; } };

  // ---- football: followed clubs and national sides, rivals, followed players through their teams
  const fbLine = (t, r) => `${r.home ? `${t} ${r.us}-${r.them} ${r.opponent}` : `${r.opponent} ${r.them}-${r.us} ${t}`}${r.shootout ? ` (${r.shootout.us}-${r.shootout.them} on penalties)` : ""}`;
  const fbItem = (f, stance, t, r) => ({
    id: `fb-${r.uid}-${stance}`, sport: "football", kind: "result", subject: f.name, stance, care: stance === "rival" ? "rival" : care(f), when: r.date, when_local: at(r.date),
    competition: r.competition, stage: r.stage, line: fbLine(t.name, r), venue: r.venue,
    goals: r.goals.map(g => `${g.minute} ${g.forUs ? f.name : r.opponent}: ${g.scorer}${g.kind && g.kind !== "goal" ? ` (${g.kind})` : ""}${g.assist ? `, assist ${g.assist}` : ""}, ${g.score}`),
    reds: r.reds.map(x => `${x.minute} ${x.forUs ? f.name : r.opponent}: ${x.player}`), facts: r.facts, arc: r.arc, form_before: r.form_before || null,
    table: stance === "love" && r.league && r.league === f.league ? tableFor(t) : null, source: r.source,
  });
  // The league table, only with a loved side's league result and said after it (Parth, 15 Oct: a rival top of the
  // table is named only on the day Madrid play, after Madrid's result, never on other days)
  const rivalIds = new Set((profile.rivals || []).map(r => String(r.espn_id)));
  const tableFor = t => {
    if (!t.table) return null;
    const rows = t.table.rows, me = rows.find(r => r.id === t.id), top = rows[0];
    return { league: t.table.league, position: me?.rank ?? null, points: me?.points ?? null, played: me?.played ?? null, points_off_top: me && top ? top.points - me.points : null,
      rows: rows.map(r => ({ rank: r.rank, team: r.team, points: r.points, ...(rivalIds.has(r.id) ? { rival: true } : {}) })) };
  };
  for (const f of profile.follows.filter(f => f.sport === "football" && f.kind === "team")) {
    const t = await safe(f.name, () => football.team(f, { ...W, rivals: [...rivalIds], rivalNames: (profile.rivals || []).map(r => r.name) }));
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
        add({ ...fbItem({ ...tm, care: care(f) }, "love", t, r), id: `fb-${r.uid}-${f.name}`, subject: f.name, care: care(f), player_note: his.length ? `${f.name} scored ${his.length === 1 ? "once" : his.length + " times"} (${his.map(g => g.minute).join(", ")}) for ${tm.name}` : null });
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
  const sports = new Set([...profile.follows.map(f => f.sport), ...(profile.rivals || []).map(f => f.sport), ...(profile.wider?.sports_wanted || [])]);
  const lang = profile.listener?.language || "en-IN";
  const deskFeeds = [...sports].flatMap(s => feeds[s] || []), names = profile.follows.filter(f => f.kind !== "all");
  const tagged = (list, sport) => list.map(f => ({ ...f, sport }));
  const pool = await safe("news", () => news.feeds([...[...sports].flatMap(s => tagged(feeds[s] || [], s)), ...tagged(feeds.general || [], null), ...[...names, ...(profile.rivals || [])].flatMap(f => (feeds.teams?.[f.name] || []).map(x => (x.google ? news.searchFeed(x.google, x.edition || lang, f.sport, { raw: true }) : { ...x, sport: f.sport }))), ...names.map(f => (/ men$/.test(f.name) ? news.searchFeed(`${f.name.replace(/ men$/, "")} cricket`, lang, f.sport, { intitle: false }) : news.searchFeed(f.search || f.name, lang, f.sport)))], W)) || [];
  // sports the listener never wants (profile.wider.skip_sports, matched by config/show.json sport_words)
  const skipRx = (profile.wider?.skip_sports || []).flatMap(k => show.sport_words?.[k] || [k]).map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
  const clusters = news.cluster(pool).filter(c => !c.titles.some(t => skipRx.some(r => r.test(t)))).filter(c => { if (ledger.newsSaid(said, c)) { already.push(`news: ${c.headline}`); return false; } return true; });
  const rx = n => new RegExp(`\\b(${n})\\b`, "i");
  // how a name appears in headlines (the setup page will ask for these; for now, Parth's), and what a match is not
  // How each subject appears in headlines: the profile's aliases (plain words a listener can edit) and, for a team, its
  // squad from ESPN, fetched every run so a new signing counts from the day ESPN lists him. If ESPN fails, the last
  // squad that loaded is used (ledger/squads.json). The profile's "not" phrases are taken out of a headline first, so
  // "Atletico Madrid 2-0 Real Madrid" is still Madrid and "Atletico Madrid sign a striker" is not.
  const squads = ledger.squads();
  for (const f of [...profile.follows, ...(profile.rivals || [])].filter(f => f.kind === "team" && (f.espn_id || f.espn_abbr))) {
    const names = await safe(`${f.name} squad (last known used)`, () => (f.sport === "basketball" ? nba.roster(f) : football.roster(f)));
    if (names?.length >= 8) squads[f.name] = { names, as_of: new Date(now).toISOString() };
  }
  // a whole tour (Men's tennis): its ranked players stand for it, so a women's final is not men's tennis news
  for (const f of profile.follows.filter(f => f.kind === "all" && f.sport === "tennis")) {
    const tour = /women|wta/i.test(f.name) ? "wta" : "atp";
    const names = await safe(`${f.name} rankings (last known used)`, () => tennis.rankings(tour));
    if (names?.length >= 20) squads[f.name] = { names, as_of: new Date(now).toISOString() };
  }
  ledger.saveSquads(squads);
  const matchers = new Map();
  const who = f => { if (!matchers.has(f.name)) matchers.set(f.name, buildMatcher(f, squads[f.name]?.names || [])); return matchers.get(f.name); };
  const rivalRx = (profile.rivals || []).map(who);
  const used = new Set();
  const news_items = [];
  // A report of a match already in the pack (it names the opponent, or reads like a result) is colour for that result,
  // not a story of its own: the writer gets its text with the result.
  const results = items.filter(i => i.kind === "result" && i.stance !== "rival");
  // (written after the match started, and naming the opponent, a scorer or reading like a result)
  const RESULTY = /\b(\d+-\d+|beat|beats|beaten|win|wins|won|lose|loses|lost|loss|draw|drew|comeback|defeat|exit|exits|out of|stun|stuns|shock|upset|thriller|knocked|crash)\b/i;
  const reportOf = (c, f) => results.find(i => {
    // a report names the opponent or a scorer (within four days of the match) or reads like a result (within 40 hours)
    if (i.subject !== f.name || c.date < Date.parse(i.when) || c.date - Date.parse(i.when) > 96 * 36e5) return false;
    const names = [...i.line.split(/ \d+-\d+ | v |: | bt |, | won by .*$/), ...(i.goals || []).map(g => g.split(": ")[1]?.split(/[,(]/)[0]?.trim().split(" ").at(-1))].map(p => p && p.replace(/^AS |\(\w+\)|\(\d+\)/g, "").trim()).filter(p => p && p.length > 3 && p !== f.name && !f.name.includes(p));
    return names.some(p => c.headline.includes(p)) || (RESULTY.test(c.headline) && c.date - Date.parse(i.when) <= 40 * 36e5);
  });
  for (const f of names) {
    const cap = { "die-hard": 4, follow: 2, "big-moments": 1 }[care(f)] ?? 1, min = care(f) === "big-moments" ? 2 : 1;
    // a story is the subject's when any of its headlines names the subject (the lead one may not); it is shown by the
    // headline that does. A story that also names the rival is still the subject's ("Vinicius to miss Barcelona game").
    const mine = clusters.filter(c => !used.has(c) && c.n >= min && c.titles.some(t => who(f).test(t))).map(c => Object.assign(c, { headline: c.titles.find(t => who(f).test(t)) || c.headline }));
    for (const c of mine) {
      // a preview of a match that has since been played is old news: the result says it now
      if (results.some(i => i.subject === f.name && c.date < Date.parse(i.when) && i.line.split(/ \d+-\d+ | v |: | bt |, /).some(p => p && p.length > 3 && p !== f.name && !f.name.includes(p) && c.headline.includes(p.replace(/^AS /, ""))))) { used.add(c); continue; }
      const r = reportOf(c, f);
      if (r) { used.add(c); (r.reports ||= []).push(c); continue; }
      if (news_items.filter(n => n.subject === f.name).length >= cap) continue;
      used.add(c); news_items.push({ subject: f.name, care: care(f), ...c });
    }
  }
  // A follower of a whole sport (Men's tennis, Formula 1) gets that sport's biggest stories of the day, the ones two or
  // more outlets ran, after the stories about the people they follow by name (15 Oct: the Six Kings Slam postponement)
  for (const f of profile.follows.filter(f => f.kind === "all")) {
    const cap = { "die-hard": 3, follow: 2, "big-moments": 1 }[care(f)] ?? 1;
    const ok = c => (f.sport !== "tennis" || c.titles.some(t => who({ ...f, aliases: f.aliases || [/women|wta/i.test(f.name) ? "WTA" : "ATP", "Davis Cup", "Six Kings"] }).test(t)));
    for (const c of clusters.filter(c => !used.has(c) && c.sport === f.sport && c.n >= (care(f) === "big-moments" ? 3 : 2) && ok(c) && !c.titles.some(t => rivalRx.some(r => r.test(t)))).slice(0, cap)) {
      used.add(c); news_items.push({ subject: f.name, care: care(f), ...c });
    }
  }

  // A rival's bad news, only when it is big (Parth, 15 Oct: "only if it is important"): a sacking, a ban, a fine, a
  // points deduction, a crisis, booed off, knocked out; several outlets, or the rival's own desk and one more. Never an
  // injury, an illness or anything personal, and never a match report (their results come above).
  const RIVAL_BAD = /\b(sack(?:ed|ing)?|fired|under pressure|pressure mounts|crisis|turmoil|banned|ban|fined|fine|sanction(?:ed|s)?|points? deduction|deducted|investigat(?:ed|ion)|charged|booed|whistled|humiliat(?:ed|ion)|thrashed|knocked out|eliminated|crash out|slump|winless|debt|losses|ultimatum|walk-?out|rift|row)\b/i;
  const PERSONAL = /\b(injur(?:y|ed|ies)|hamstring|knee|ankle|muscle|sidelined|ruled out|surgery|ill|illness|sick|hospital|died|death|dies|family|wife|girlfriend|baby|funeral|mourning|grief|mental health)\b/i;
  const rival_news = [];
  for (const f of profile.rivals || []) {
    const desk = new Set((feeds.teams?.[f.name] || []).map(x => x.name));
    const c = clusters.find(c => !used.has(c) && who(f).test(c.headline) && !c.titles.some(t => names.some(n => who(n).test(t))) && RIVAL_BAD.test(c.headline) && !PERSONAL.test(c.headline) && !RESULTY.test(c.headline.replace(RIVAL_BAD, "")) && (c.n >= 3 || (c.n >= 2 && c.outlets.some(o => desk.has(o)))));
    if (c) { used.add(c); rival_news.push({ subject: f.name, care: "rival", mood: "gleeful", ...c }); }
  }

  // the text behind each story and each result's best report, read by code (a few hundred words each, at most)
  for (const r of results) if (r.reports?.length) { r.reports.sort((a, b) => b.n - a.n); for (const c of r.reports.slice(0, 2)) if (!r.report) r.report = await news.readCluster(c); r.reports = r.reports.map(c => ({ headline: c.headline, outlets: c.outlets })); }
  await Promise.all([...news_items, ...rival_news].map(async n => { n.text = await news.readCluster(n); }));

  // ---- Around the grounds: at most two things from outside the list that any fan of the sport would expect to hear,
  // scored by code (engine/fetch/elsewhere.mjs); nothing when nothing clears the bar
  const A = show.around || { max: 2, min_drama: 4 }, B = show.big_clubs || {};
  const skip = new Set([...profile.follows, ...(profile.rivals || [])].flatMap(f => [f.name, String(f.espn_id || "")]).filter(Boolean));
  const cands = [];
  if (sports.has("football")) cands.push(...(await safe("elsewhere: football", () => elsewhere.football({ since, now, big: new Set(B.football || []), leagues: B.football_leagues || ["uefa.champions"], skip })) || []));
  if (sports.has("cricket")) cands.push(...(await safe("elsewhere: cricket", () => elsewhere.cricket({ since, tiers: show.cricket_tiers || {}, skip: new Set(["India"]) })) || []));
  // a story many outlets lead with, not about anyone on the list or a rival
  const free = c => !used.has(c) && !c.titles.some(t => rivalRx.some(r => r.test(t)) || names.some(f => who(f).test(t)));
  const country = profile.listener?.country ? new RegExp(`\\b(${profile.listener.country}|${profile.listener.country}n|${profile.listener.country}'s)\\b`, "i") : null;
  for (const c of clusters.filter(free)) { const d = elsewhere.newsDrama(c) + (country && c.titles.some(t => country.test(t)) ? 1 : 0); if (d) cands.push({ id: `news-${c.headline.slice(0, 40)}`, sport: c.sport, kind: "news", line: c.headline, outlets: c.outlets, drama: d, why: [`${c.n} outlets`], cluster: c }); }
  // the last day's results first: an older upset has had its day (rehearsals over several days only)
  for (const c of cands) if (ledger.resultSaid(said, c.id)) c.drama = 0;
  for (const c of cands) c.rank = c.drama - (c.date && Date.parse(c.date) < now - (show.window_hours ?? 30) * 36e5 ? 2 : 0);
  cands.sort((a, b) => b.rank - a.rank || Date.parse(b.date || 0) - Date.parse(a.date || 0));
  const around = cands.filter(c => c.rank >= A.min_drama).slice(0, A.max);
  for (const c of around) {
    // the result's own report, when one of the day's stories is about it
    const rep = c.cluster || clusters.find(k => !used.has(k) && (c.sides || [{ name: c.team1 }, { name: c.team2 }]).filter(x => x.name && k.headline.includes(x.name.replace(/ (FC|CF)$/, ""))).length >= 1 && /\d|beat|stun|shock|thrash|upset|win|draw|held/i.test(k.headline));
    if (rep) { used.add(rep); c.report = await news.readCluster(rep); c.report_headline = rep.headline; }
    delete c.cluster;
  }
  const considered = cands.filter(c => !around.includes(c) && c.drama > 0).slice(0, 8).map(c => `${c.line} (drama ${c.drama}: ${c.why.join(", ")})`);

  // a loved side won and a rival dropped points on the same day: both go in the cold open
  const day = t => new Date(t).toLocaleDateString("en-CA", { timeZone: TZ });
  const rivalSlips = items.filter(i => i.stance === "rival");
  for (const i of results) if (i.facts?.won && i.care === "die-hard") { const r = rivalSlips.find(x => x.sport === i.sport && Math.abs(Date.parse(x.when) - Date.parse(i.when)) < 30 * 36e5); if (r) i.double = `${r.subject} also dropped points: ${r.line}`; }

  // ---- running order and word budget
  const by = c => items.filter(i => i.kind !== "news" && c(i)).sort((a, b) => b.score - a.score);
  const open = [...items].filter(i => i.kind === "result").sort((a, b) => (b.score * b.intensity) - (a.score * a.intensity))[0] || null;
  const wpm = show.words_per_minute || 164;
  const wordsFor = i => Math.round(40 + 45 * i.score);
  const segs = [
    { id: "cold-open", items: open ? [open.id] : [], words: open ? 35 : 0 },
    { id: "die-hard", items: by(i => i.care === "die-hard").map(i => i.id), news: news_items.filter(n => n.care === "die-hard") },
    { id: "rival-watch", items: by(i => i.stance === "rival").map(i => i.id), news: rival_news },
    { id: "follow", items: by(i => i.stance !== "rival" && i.care !== "die-hard").map(i => i.id), news: news_items.filter(n => n.care !== "die-hard") },
    { id: "around", elsewhere: around, considered },
    { id: "ahead", fixtures: fixtures.filter(x => x.care !== "big-moments").sort((a, b) => a.when.localeCompare(b.when)) },
    { id: "signoff", words: 15 },
  ];
  for (const s of segs) if (s.words == null) s.words = (s.items || []).reduce((n, id) => n + wordsFor(items.find(i => i.id === id)), 0) + (s.news || []).length * 35 + (s.elsewhere || []).length * 45 + (s.fixtures || []).length * 14;
  const live = segs.filter(s => s.words > 0 && ((s.items || []).length || (s.news || []).length || (s.elsewhere || []).length || (s.fixtures || []).length || ["signoff"].includes(s.id)));
  let total = live.reduce((n, s) => n + s.words, 0);
  // The listener's length (profile.length): a big day is brought down to the target, never past it, the cold open and
  // sign-off untouched; a quiet day stays short (never padded). The writer's check holds the script under max.
  const target = (profile.length?.target ?? 8) * wpm, max = (profile.length?.max ?? profile.length?.target ?? 9) * wpm;
  if (total > target) {
    const fixed = live.filter(s => ["cold-open", "signoff"].includes(s.id)).reduce((n, s) => n + s.words, 0), k = (target - fixed) / (total - fixed);
    for (const s of live) if (!["cold-open", "signoff"].includes(s.id)) s.words = Math.round(s.words * k);
    total = live.reduce((n, s) => n + s.words, 0);
  }
  for (const s of live) { const def = show.segments.find(x => x.id === s.id); Object.assign(s, { name: def?.name, about: def?.about }); }
  return { made_at: new Date(now).toISOString(), tz: TZ, window: { from: new Date(since).toISOString(), to: new Date(now).toISOString() }, listener: profile.listener, tone: profile.tone,
    minutes: +(total / wpm).toFixed(1), words: total, max_words: max, quiet: total < target * 0.75, running_order: live, items, fixtures, suppressed, already_said: already, errors };
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
      L.push(`  - Strength: ${i.intensity} of 5${i.arc ? ` · Shape: ${i.arc.text} (from ${i.arc.from} to ${i.mood})` : ""}${i.form_before ? ` · Form before (newest first): ${i.form_before}` : ""}`);
      if (i.double) L.push(`  - Same day: ${i.double}`);
      if (i.goals?.length) L.push(`  - Goals: ${i.goals.join("; ")}`);
      if (i.reds?.length) L.push(`  - Red cards: ${i.reds.join("; ")}`);
      if (i.player_note) L.push(`  - ${i.player_note}`);
      if (i.scorecard) L.push(`  - Scorecard: ${i.scorecard}`);
      if (i.series) L.push(`  - Series: ${i.series}`);
      if (i.top3) L.push(`  - Top three: ${i.top3}`);
      if (i.standings) L.push(`  - Standings: ${i.standings.join(", ")}`);
      if (i.table) L.push(`  - Table (said after the result): ${i.table.rows.map(r => `${r.rank}. ${r.team} ${r.points}`).join(", ")}`);
      if (i.report) L.push(`  - Match report (${i.report.source}): ${i.report.text}`);
      if (i.reports?.length) L.push(`  - Also reported: ${i.reports.map(c => `${c.headline} (${c.outlets.length})`).join("; ")}`);
      const facts = Object.entries(i.facts || {}).filter(([k, v]) => v === true).map(([k]) => k);
      if (facts.length) L.push(`  - Facts the mood used: ${facts.join(", ")}`);
    }
    for (const n of s.news || []) { L.push(`- ${n.subject ? `**${n.subject}** · ` : ""}${n.headline} _(${n.outlets.join(", ")})_`); if (n.text) L.push(`  - ${n.text.source}: ${n.text.text}`); }
    for (const c of s.elsewhere || []) { L.push(`- ${c.line} _(${c.competition || c.outlets?.join(", ") || ""}; drama ${c.drama}: ${c.why.join(", ")})_`); if (c.report) L.push(`  - ${c.report.source}: ${c.report.text}`); }
    if (s.considered?.length) L.push("", "Considered, not used:", ...s.considered.map(x => `- ${x}`));
    for (const x of s.fixtures || []) L.push(`- ${x.when_local} · ${x.what} · ${x.competition || ""}${x.venue ? ` · ${x.venue}` : ""}`);
    if (s.id === "signoff") L.push("- The fixed closing line.");
    L.push("");
  }
  if (P.suppressed.length) L.push("## Left out on purpose", ...P.suppressed.map(x => `- ${x}`), "");
  if (P.already_said?.length) L.push("## Already said in an earlier episode", ...P.already_said.map(x => `- ${x}`), "");
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
