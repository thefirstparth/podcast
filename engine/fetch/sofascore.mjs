// Sofascore's public JSON (keyless, unofficial, the data behind sofascore.com): the backup for ESPN's scores (Parth,
// 15 Oct: "ESPN is the only reliable one ... find a workaround"). Checked 15 Oct 2026: Roma 3-4 Real Madrid with
// every goal, minute, scorer and assist the same as ESPN's. One source for football, basketball and tennis (a tennis
// player is a "team" there). Rows come out in the same shape as the ESPN fetchers', so everything after is shared.
import { getJSON } from "../http.mjs";

const SS = "https://api.sofascore.com/api/v1";
const UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", accept: "application/json" };
const get = p => getJSON(`${SS}/${p}`, { headers: UA });

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
