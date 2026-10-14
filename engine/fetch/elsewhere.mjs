// Big results outside the listener's list, the ones any fan of the sport would expect to hear about: a big club beaten
// by a smaller one, a big club thrashed, a goal-fest, an associate beating a Test side, a huge Test win. Scored by code
// (drama), so the show can say at most one or two of them, and nothing on a quiet day. Draft rules for discussion
// (Parth, 15 Oct: "if Manchester City faces a big upset ... not more than one or two readouts").
import { getJSON, getText } from "../http.mjs";
import { parseCricbuzz } from "./cricket.mjs";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const days = (since, now) => { const out = []; for (let t = since - 864e5; t <= now + 864e5; t += 864e5) out.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, "")); return [...new Set(out)]; };

export function footballDrama(m, big) {
  const [h, a] = m.sides, hb = big.has(h.name), ab = big.has(a.name), total = h.score + a.score, margin = Math.abs(h.score - a.score);
  const why = [];
  let d = 0;
  for (const [me, them, home] of [[h, a, true], [a, h, false]]) {
    if (!big.has(me.name)) continue;
    if (me.score < them.score && !big.has(them.name)) { d += home ? 6 : 5; why.push(`${me.name} beaten by ${them.name}${home ? " at home" : ""}`); }
    else if (me.score === them.score && !big.has(them.name)) { d += 3; why.push(`${me.name} held by ${them.name}`); }
    if (them.score - me.score >= 3) { d += 2; why.push(`${me.name} lost by ${them.score - me.score}`); }
  }
  if (hb && ab && margin >= 2) { d += 3; why.push("a big match won by two or more"); }
  if (total >= 9) { d += 3; why.push(`${total} goals`); } else if (total >= 7) { d += 2; why.push(`${total} goals`); }
  if ((hb || ab) && margin >= 5) { d += 1; why.push(`won by ${margin}`); }
  return { drama: d, why };
}

export async function football({ since, now, big, leagues, skip }) {
  const out = [], seen = new Set();
  for (const L of leagues) for (const day of days(since, now)) {
    const j = await getJSON(`${ESPN}/${L}/scoreboard?dates=${day}`).catch(() => null);
    for (const e of j?.events || []) {
      const c = e.competitions?.[0];
      if (!c?.status?.type?.completed || seen.has(e.id) || Date.parse(e.date) < since) continue;
      seen.add(e.id);
      const sides = [...(c.competitors || [])].sort((x, y) => (x.homeAway === "home" ? -1 : 1)).map(x => ({ name: x.team?.displayName, id: String(x.team?.id), score: Number(x.score) }));
      if (sides.some(s => skip.has(s.id) || skip.has(s.name))) continue;
      const m = { id: `fb-${e.id}`, sport: "football", competition: j.leagues?.[0]?.name || L, date: e.date, sides, line: `${sides[0].name} ${sides[0].score}-${sides[1].score} ${sides[1].name}` };
      Object.assign(m, footballDrama(m, big));
      out.push(m);
    }
  }
  return out;
}

const tierOf = (tiers, name) => { for (const [t, list] of Object.entries(tiers)) if (list.includes(name)) return Number(t); return 4; };
export function cricketDrama(m, tiers) {
  const t1 = tierOf(tiers, m.team1), t2 = tierOf(tiers, m.team2), st = String(m.status || "");
  const winner = st.match(/^(.+?) won/)?.[1]?.trim(), loser = winner === m.team1 ? m.team2 : winner === m.team2 ? m.team1 : null;
  const why = [];
  let d = 0;
  if (winner && loser) {
    const tw = tierOf(tiers, winner), tl = tierOf(tiers, loser);
    if (tw > tl) { d += tl === 1 ? 6 : 4; why.push(`${winner} (tier ${tw}) beat ${loser} (tier ${tl})`); }
    const runs = Number(st.match(/by (\d+) runs/)?.[1]) || 0, innings = /an innings/.test(st), wkts = Number(st.match(/by (\d+) wkts?/)?.[1]) || 0;
    if (Math.min(tw, tl) <= 2 && (innings || runs >= 150 || wkts === 10)) { d += 4; why.push(innings ? "an innings win" : runs ? `by ${runs} runs` : "by 10 wickets"); }
    else if (tl === 1 && (runs >= 100 || wkts >= 9)) { d += 2; why.push(`${loser} beaten heavily`); }
  }
  if (/^TEST$/i.test(m.format) && Math.min(t1, t2) === 1) d += 1;
  return { drama: d, why };
}

// Men's internationals between ranked sides, from Cricbuzz's recent matches page (the parser The Crease uses)
export async function cricket({ since, tiers, skip }) {
  const html = await getText("https://www.cricbuzz.com/cricket-match/live-scores/recent-matches");
  const out = [];
  for (const o of parseCricbuzz(html)) {
    const team1 = o.team1?.teamName, team2 = o.team2?.teamName, start = Number(o.startDate), end = Number(o.endDate) || start;
    if (!/complete|won|draw/i.test(`${o.state} ${o.status}`) || end < since) continue;
    if (/women|legends|champions|\bA\b|u-?19|ranji|trophy|t20 challenge|spring|league two|qualifier/i.test(`${o.seriesName} ${team1} ${team2}`)) continue;
    if (tierOf(tiers, team1) === 4 && tierOf(tiers, team2) === 4) continue;
    if (skip.has(team1) || skip.has(team2)) continue;
    const m = { id: `cr-${o.matchId}`, sport: "cricket", competition: o.seriesName, format: o.matchFormat, date: new Date(start).toISOString(), team1, team2, status: o.status, line: `${o.matchDesc}, ${o.seriesName}: ${o.status}` };
    Object.assign(m, cricketDrama(m, tiers));
    out.push(m);
  }
  return out;
}

// A story many outlets are leading with, of the kind that is news whatever the result: sackings, bans, records
const BIG_NEWS = /\b(sacked|fired|resigns?|steps down|appointed|banned|suspended|stripped|retires?|retirement|world record|record-breaking|dies|died|death|arrested|charged)\b/i;
export const newsDrama = c => (BIG_NEWS.test(c.headline) ? Math.min(6, 2 + c.n) : c.n >= 5 ? 3 : 0);
