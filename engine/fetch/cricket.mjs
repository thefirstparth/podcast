// India's (or any side's) cricket, from Cricbuzz's team pages: the structured match data embedded in the results and
// schedule pages. parseCricbuzz, toMatch and inningsLine are copied from The House of 1400 (lib/cricket.js, The
// Crease), where they have run daily since 1 Oct 2026; TEAM is a parameter here so any side works.
import { getText, getJSON } from "../http.mjs";
import * as sofa from "./sofascore.mjs";

// Cricbuzz's team pages embed each match as a matchInfo object in their Next.js payload; this pulls them out, with the
// matchScore that follows it in the same match object (runs, wickets and overs per innings) when there is one.
export function parseCricbuzz(html) {
  const flat = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)].map(m => { try { return JSON.parse(`"${m[1]}"`); } catch { return ""; } }).join("");
  const objAt = i => {
    let depth = 0, j = i;
    for (; j < flat.length; j++) { const ch = flat[j]; if (ch === "{") depth++; else if (ch === "}") { depth--; if (!depth) break; } else if (ch === '"') { for (j++; j < flat.length && flat[j] !== '"'; j++) if (flat[j] === "\\") j++; } }
    return [flat.slice(i, j + 1), j];
  };
  const out = [], seen = new Map();
  for (const m of flat.matchAll(/"matchInfo":\{/g)) {
    try {
      const [txt, end] = objAt(m.index + 12), o = JSON.parse(txt);
      const sc = ',"matchScore":{';
      if (flat.startsWith(sc, end + 1)) o.matchScore = JSON.parse(objAt(end + sc.length)[0]);
      if (!o.matchId) continue;
      if (!seen.has(o.matchId)) { seen.set(o.matchId, o); out.push(o); }
      else if (o.matchScore && !seen.get(o.matchId).matchScore) seen.get(o.matchId).matchScore = o.matchScore;
    } catch {}
  }
  return out;
}


let TEAM = 2;
export function toMatch(o) {
  const us = o.team1?.teamId === TEAM ? o.team1 : o.team2, them = o.team1?.teamId === TEAM ? o.team2 : o.team1;
  // An abandoned or washed-out match is "off", never "live" (Cricbuzz's state for it is "Abandon")
  const state = /complete/i.test(o.state) ? "done" : /abandon|no result/i.test(`${o.state} ${o.status}`) ? "off" : /preview|upcoming|toss/i.test(o.state || "") || !o.state ? "next" : "live";
  const status = String(o.status || "").replace(/\s+-\s+/g, " · ").trim();
  const won = state === "done" ? (new RegExp(`^${(us?.teamName || "India").replace(/\W/g, ".")}\\s+won`, "i").test(status) ? true : /\swon\s/i.test(status) ? false : null) : null;
  const n = Number((o.matchDesc || "").match(/^(\d+)(?:st|nd|rd|th)\s/)?.[1]) || null;
  return { id: o.matchId, series: o.seriesName, series_id: o.seriesId ?? null, format: o.matchFormat, desc: o.matchDesc, n, opponent: them?.teamName || "TBC", start: new Date(Number(o.startDate)).toISOString(),
    time_announced: o.isTimeAnnounced !== false, city: o.venueInfo?.city || null, ground: o.venueInfo?.ground || null, state, status: state === "next" ? null : status, won,
    score: state === "next" ? null : inningsLine(o) };
}
// The scorecard in one line, innings in the order they were batted: "WI 245/8 (50 ov) · IND 246/2 (38.4 ov)".
// Cricbuzz writes a completed over as .6 (49.6 is 50 overs); ten wickets is all out, shown as the runs alone.
const oversOf = v => { const w = Math.floor(v), b = Math.round((v - w) * 10); return b >= 6 ? String(w + 1) : b ? `${w}.${b}` : String(w); };
export function inningsLine(o) {
  const S = o.matchScore; if (!S) return null;
  const inns = [["team1Score", o.team1], ["team2Score", o.team2]].flatMap(([k, t]) => Object.values(S[k] || {}).map(x => ({ ...x, team: t?.teamSName || t?.teamName || "" })))
    .filter(x => Number.isFinite(x.runs)).sort((a, b) => (a.inningsId ?? 0) - (b.inningsId ?? 0));
  if (!inns.length) return null;
  const by = new Map();
  // A finished innings (any but the one being batted) that Cricbuzz gives as a whole number of overs short of the full
  // allotment (41 for 41.4, seen 27 Sep to 6 Oct 2026) may have lost its balls: its overs are left out rather than
  // risk printing them wrong.
  const full = { ODI: 50, T20: 20 }[o.matchFormat], lastInn = inns.at(-1);
  const oversOk = x => Number.isFinite(x.overs) && o.matchFormat !== "TEST" && !((x !== lastInn || /complete/i.test(o.state || "")) && full && Number.isInteger(x.overs) && x.overs < full);
  for (const x of inns) { if (!by.has(x.team)) by.set(x.team, []); by.get(x.team).push(`${x.runs}${x.wickets != null && x.wickets < 10 ? "/" + x.wickets : ""}${oversOk(x) ? ` (${oversOf(x.overs)} ov)` : ""}`); }
  return [...by].map(([t, l]) => `${t} ${l.join(" & ")}`).join(" · ");
}

// The backup when Cricbuzz fails: ESPN's cricket API (ESPNcricinfo's data, keyless), as The House of 1400's Crease
// uses it (lib/cricket-espn.js, from 3 Oct 2026). The header lists the series the side is in now; each series'
// scoreboard, a day at a time, gives its matches in the same shape as toMatch.
const HEADER = "https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=in";
const BOARD = (league, d) => `https://site.api.espn.com/apis/site/v2/sports/cricket/${league}/scoreboard?dates=${d}`;
const tidy = s => String(s || "").replace(/\((\d+(?:\.\d)?)\/\d+ ov[^)]*\)/, "($1 ov)").replace(/\s*\(target[^)]*\)/, "").trim();
const FORMAT = d => (/\bTest\b/i.test(d) ? "TEST" : /\bT20/i.test(d) ? "T20" : /\bODI\b/i.test(d) ? "ODI" : null);
export function espnMatch(e, series, side = "India") {
  const isUs = c => new RegExp(`^${side}$`, "i").test(c?.team?.displayName || c?.displayName || "");
  const c = e.competitions?.[0] || {}, cs = c.competitors || [], us = cs.find(isUs), them = cs.find(x => !isUs(x));
  if (!us) return null;
  const st = c.status?.type?.state, state = st === "post" ? "done" : st === "in" ? "live" : "next", desc = c.description || e.shortName || "";
  return { id: `espn${e.id}`, series, format: FORMAT(`${desc} ${series}`) || "T20", desc, opponent: them?.team?.displayName || "TBC", start: new Date(Date.parse(e.date)).toISOString(),
    city: c.venue?.address?.city || null, ground: c.venue?.fullName || null, state,
    status: state === "next" ? null : String(c.status?.summary || c.status?.type?.detail || "").trim(),
    won: state === "done" ? (String(us.winner) === "true" ? true : String(them?.winner) === "true" ? false : null) : null,
    score: state === "next" ? null : cs.filter(x => x.score).map(x => `${x.team?.abbreviation || x.team?.displayName} ${tidy(x.score)}`).join(" · ") || null };
}
async function espnMatches(side, since, until) {
  const h = await getJSON(HEADER, { timeout: 10000 });
  const isUs = c => new RegExp(`^${side}$`, "i").test(c?.displayName || c?.name || "");
  const leagues = (h.sports?.[0]?.leagues || []).filter(l => (l.events || []).some(e => (e.competitors || []).some(isUs)));
  if (!leagues.length) throw new Error(`ESPN cricket: ${side} in no current series`);
  const days = [];
  for (let t = since - 864e5; t <= until; t += 864e5) days.push(new Date(t + 5.5 * 36e5).toISOString().slice(0, 10).replace(/-/g, ""));
  const lists = await Promise.all(leagues.flatMap(l => days.map(d => getJSON(BOARD(l.id, d), { timeout: 8000 }).then(j => (j.events || []).map(e => espnMatch(e, String(l.name || "").replace(/\s+\d{4}(\/\d{2})?$/, ""), side)).filter(Boolean)).catch(() => []))));
  return lists.flat();
}

// The first backup: Sofascore (checked 15 Oct 2026: the same results as Cricbuzz for India v West Indies), in toMatch's
// shape. Sofascore has no match numbers, so they are counted within each series.
async function sofaMatches(ssId, side) {
  const [last, next] = await Promise.all(["last", "next"].map(k => sofa.raw(`team/${ssId}/events/${k}/0`).catch(() => ({ events: [] }))));
  const evs = [...(last.events || []), ...(next.events || [])].sort((a, b) => a.startTimestamp - b.startTimestamp);
  const fmt = n => (/\bTest/i.test(n) ? "TEST" : /T20/i.test(n) ? "T20" : /ODI|One Day/i.test(n) ? "ODI" : "T20");
  const word = { TEST: "Test", T20: "T20I", ODI: "ODI" }, nth = k => `${k}${["th", "st", "nd", "rd"][k % 10 > 3 || [11, 12, 13].includes(k % 100) ? 0 : k % 10]}`;
  const count = new Map();
  return evs.map(e => {
    const home = String(e.homeTeam?.id) === String(ssId), opp = home ? e.awayTeam : e.homeTeam, series = e.tournament?.name || "", format = fmt(series);
    const k = (count.get(series) || 0) + 1; count.set(series, k);
    const inn = (sc, t) => Object.values(sc?.innings || {}).map(i => `${t} ${i.score}${i.wickets < 10 ? `/${i.wickets}` : ""} (${i.overs} ov)`);
    const done = e.status?.type === "finished";
    return { id: `ss${e.id}`, series, format, desc: `${nth(k)} ${word[format]}`, n: k, opponent: opp?.name || "TBC", start: new Date(e.startTimestamp * 1000).toISOString(), time_announced: true,
      city: e.venue?.city?.name || null, ground: e.venue?.name || null, state: done ? "done" : e.status?.type === "inprogress" ? "live" : "next", status: done ? e.note || e.status?.description : null,
      won: done ? (e.winnerCode === (home ? 1 : 2) ? true : e.winnerCode ? false : null) : null,
      score: done ? [...inn(e.homeScore, e.homeTeam?.nameCode || e.homeTeam?.name), ...inn(e.awayScore, e.awayTeam?.nameCode || e.awayTeam?.name)].join(" · ") : null };
  });
}

export async function team({ cricbuzz_id: id = 2, sofascore_id: ssId, name }, { since, until }) {
  TEAM = id;
  const side = String(name || "India").replace(/ men$/i, ""), slug = side.split(/\s+/)[0].toLowerCase(), base = `https://www.cricbuzz.com/cricket-team/${slug}/${id}`;
  let src = "Cricbuzz", list;
  try {
    const [res, sch] = await Promise.all([getText(`${base}/results`), getText(`${base}/schedule`).catch(() => "")]);
    list = [...parseCricbuzz(res), ...parseCricbuzz(sch)].filter(o => o.team1?.teamId === id || o.team2?.teamId === id).map(toMatch);
    if (!list.length) throw new Error("Cricbuzz: no matches");
  } catch (e) {
    try { if (!ssId) throw e; list = await sofaMatches(ssId, side); if (!list.length) throw new Error("Sofascore: no matches"); src = "Sofascore"; }
    catch { list = await espnMatches(side, since, until); src = "ESPN"; }
  }
  const all = [...new Map(list.map(m => [m.id, m])).values()].sort((a, b) => a.start.localeCompare(b.start));
  // a match counts in the window when it ended in it: a Test that started four days ago and finished today is in
  const results = all.filter(m => m.state === "done" && Date.parse(m.start) >= since - (m.format === "TEST" ? 4 * 864e5 : 0) && Date.parse(m.start) <= Date.now()).map(m => {
    const margin = String(m.status || "").match(/by (\d+) (run|wkt|wicket)/i), n = margin ? Number(margin[1]) : null, runs = margin && /run/i.test(margin[2]);
    return { ...m, facts: { won: m.won === true, lost: m.won === false, drew: m.won == null, big: n != null && (runs ? n >= 75 : n >= 8), close: n != null && (runs ? n <= 15 : n <= 2), stage: /final/i.test(m.desc || "") ? "final" : /semi|qualifier|eliminator/i.test(m.desc || "") ? "knockout" : "league", preseason: false, title: /final/i.test(m.desc || "") && m.won === true } };
  });
  const fixtures = all.filter(m => m.state !== "done" && Date.parse(m.start) <= until && Date.parse(m.start) > Date.now() - 12 * 36e5);
  // the series each result belongs to, as played so far
  // (one format at a time: a tour of Tests and T20Is is two series to a listener)
  const series = [...new Map(results.map(r => [`${r.series}|${r.format}`, r])).values()].map(r => {
    const s = r.series, ms = all.filter(m => m.series === s && m.format === r.format), done = ms.filter(m => m.state === "done");
    return { name: s, format: r.format, played: done.length, total: ms.length, won: done.filter(m => m.won === true).length, lost: done.filter(m => m.won === false).length, left: ms.filter(m => m.state !== "done").map(m => ({ desc: m.desc, start: m.start, city: m.city })) };
  });
  return { name, results, fixtures, series, source: src };
}
