// Sofascore's public JSON (keyless, unofficial, the data behind sofascore.com): the backup for ESPN's scores (Parth,
// 15 Oct: "ESPN is the only reliable one ... find a workaround"). Checked 15 Oct 2026: Roma 3-4 Real Madrid with
// every goal, minute, scorer and assist the same as ESPN's. One source for football, basketball and tennis (a tennis
// player is a "team" there). Rows come out in the same shape as the ESPN fetchers', so everything after is shared.
import { getJSON } from "../http.mjs";

const SS = "https://api.sofascore.com/api/v1";
const UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", accept: "application/json" };
const get = p => getJSON(`${SS}/${p}`, { headers: UA });
export const raw = get;

export function rowOf(e, id) {
  const home = String(e.homeTeam?.id) === String(id), me = home ? e.homeTeam : e.awayTeam, opp = home ? e.awayTeam : e.homeTeam;
  const sc = side => e[side]?.display ?? e[side]?.current ?? null, us = sc(home ? "homeScore" : "awayScore"), them = sc(home ? "awayScore" : "homeScore");
  const pens = side => e[side]?.penalties ?? null;
  return { id: `ss${e.id}`, ss_id: e.id, ss_home: e.homeTeam?.id, date: new Date(e.startTimestamp * 1000).toISOString(), league: null,
    competition: e.tournament?.uniqueTournament?.name || e.tournament?.name || "", stage_text: [e.tournament?.name, e.roundInfo?.name].filter(Boolean).join(" "),
    home, opponent: opp?.name || null, opponent_id: opp?.id ? `ss${opp.id}` : null, venue: null, completed: e.status?.type === "finished", state: e.status?.type || null,
    us: us == null ? null : Number(us), them: them == null ? null : Number(them), shootout: pens(home ? "homeScore" : "awayScore") != null ? { us: pens(home ? "homeScore" : "awayScore"), them: pens(home ? "awayScore" : "homeScore") } : null, me: me?.name };
}

export async function teamEvents(id) {
  const [last, next] = await Promise.all([get(`team/${id}/events/last/0`), get(`team/${id}/events/next/0`).catch(() => ({ events: [] }))]);
  return { past: (last.events || []).map(e => rowOf(e, id)), next: (next.events || []).map(e => rowOf(e, id)) };
}

// A match's goals and red cards as ESPN-style key events, so football.mjs storyOf reads them unchanged. The side a
// goal counts for is taken from the running score, which also settles own goals.
export async function keyEvents(row, usId) {
  const j = await get(`event/${row.ss_id}/incidents`);
  const list = [...(j.incidents || [])].reverse(), out = [];
  let h = 0, a = 0;
  const us = String(usId);
  for (const i of list) {
    const clock = { displayValue: `${i.time}'${i.addedTime ? `+${i.addedTime}'` : ""}` };
    if (i.incidentType === "goal" && i.homeScore != null) {
      const homeScored = i.homeScore > h; h = i.homeScore; a = i.awayScore;
      const text = i.incidentClass === "ownGoal" ? "Own Goal" : i.incidentClass === "penalty" ? "Penalty - Scored" : "Goal";
      out.push({ type: { text }, clock, team: { id: homeScored === row.home ? us : "opp" }, participants: [{ athlete: { displayName: i.player?.name } }, ...(i.assist1 ? [{ athlete: { displayName: i.assist1.name } }] : [])] });
    } else if (i.incidentType === "card" && /red/i.test(i.incidentClass || "")) {
      out.push({ type: { text: "Red Card" }, clock, team: { id: i.isHome === row.home ? us : "opp" }, participants: [{ athlete: { displayName: i.player?.name } }] });
    }
  }
  return out;
}

// Find an id by name (for the setup page, and for filling in a profile)
export async function find(q, type = "team") {
  const j = await get(`search/all?q=${encodeURIComponent(q)}`);
  return (j.results || []).filter(r => r.type === type).map(r => ({ id: r.entity?.id, name: r.entity?.name, sport: r.entity?.sport?.slug }));
}

// Tennis: a player's matches in the same shape as tennis.mjs player() (the backup when ESPN's scoreboard fails)
export async function tennisPlayer({ sofascore_id: id, name }, { since, until }) {
  const [last, next] = await Promise.all([get(`team/${id}/events/last/0`), get(`team/${id}/events/next/0`).catch(() => ({ events: [] }))]);
  const shape = e => {
    const home = String(e.homeTeam?.id) === String(id), me = home ? e.homeScore : e.awayScore, op = home ? e.awayScore : e.homeScore, opp = home ? e.awayTeam : e.homeTeam;
    const sets = [1, 2, 3, 4, 5].filter(k => me?.[`period${k}`] != null).map(k => `${me[`period${k}`]}-${op[`period${k}`]}${me[`period${k}TieBreak`] != null ? ` (${Math.min(me[`period${k}TieBreak`], op[`period${k}TieBreak`])})` : ""}`).join(" ");
    const won = e.winnerCode === (home ? 1 : 2), final = /^final$/i.test(e.roundInfo?.name || ""), semi = /semi/i.test(e.roundInfo?.name || "");
    return { id: `ss${e.id}`, tournament: e.tournament?.uniqueTournament?.name || e.tournament?.name, round: e.roundInfo?.name || null, date: new Date(e.startTimestamp * 1000).toISOString(),
      state: e.status?.type === "finished" ? "post" : "pre", opponent: opp?.name, score: sets,
      note: e.status?.type === "finished" ? `${won ? name : opp?.name} bt ${won ? opp?.name : name} ${won ? sets : sets.replace(/(\d+)-(\d+)/g, "$2-$1")}` : null,
      facts: { won, lost: !won, drew: false, eliminated: !won, title: won && final, big: false, upset: !won && (opp?.ranking || 999) > (home ? e.homeTeam : e.awayTeam)?.ranking + 20, stage: final ? "final" : semi ? "knockout" : "round", preseason: false } };
  };
  const results = (last.events || []).filter(e => e.status?.type === "finished" && e.startTimestamp * 1000 >= since).map(shape);
  const fixtures = (next.events || []).filter(e => e.startTimestamp * 1000 <= until).map(shape);
  return { name, results, fixtures, source: "Sofascore" };
}

// Basketball: a team's games in the same shape as nba.mjs team()
export async function basketballTeam({ sofascore_id: id, name }, { since, until }) {
  const { past, next } = await teamEvents(id);
  const g = r => ({ id: r.id, date: r.date, kind: /preseason/i.test(r.competition) ? "Preseason" : r.competition, home: r.home, opponent: r.opponent, completed: r.completed, us: r.us, them: r.them });
  const results = past.filter(r => r.completed && Date.parse(r.date) >= since).map(g);
  for (const x of results) { const m = x.us - x.them; x.facts = { won: m > 0, lost: m < 0, drew: false, big: Math.abs(m) >= 15, close: Math.abs(m) <= 5, stage: /playoff/i.test(x.kind) ? "knockout" : "league", preseason: x.kind === "Preseason" }; }
  return { name, results, fixtures: next.filter(r => !r.completed && Date.parse(r.date) <= until).map(g), source: "Sofascore" };
}
