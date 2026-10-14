// India's (or any side's) cricket, from Cricbuzz's team pages: the structured match data embedded in the results and
// schedule pages. parseCricbuzz, toMatch and inningsLine are copied from The House of 1400 (lib/cricket.js, The
// Crease), where they have run daily since 1 Oct 2026; TEAM is a parameter here so any side works.
import { getText } from "../http.mjs";

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

export async function team({ cricbuzz_id: id = 2, name }, { since, until }) {
  TEAM = id;
  const slug = String(name || "india").split(/\s+/)[0].toLowerCase(), base = `https://www.cricbuzz.com/cricket-team/${slug}/${id}`;
  const [res, sch] = await Promise.all([getText(`${base}/results`), getText(`${base}/schedule`).catch(() => "")]);
  const all = [...new Map([...parseCricbuzz(res), ...parseCricbuzz(sch)].filter(o => o.team1?.teamId === id || o.team2?.teamId === id).map(o => [o.matchId, toMatch(o)])).values()]
    .sort((a, b) => a.start.localeCompare(b.start));
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
  return { name, results, fixtures, series };
}
