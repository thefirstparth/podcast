// Football, from ESPN's keyless site API (the same source The House of 1400's Madridismo and Wider Pitch use).
// Any club or national side by its ESPN team id: results in the window with the story of each match worked out from
// its goals (came from behind, threw a lead away, a late winner, red cards), the league table around the team, and
// the fixtures in the next seven days.
import { getJSON } from "../http.mjs";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const TABLE = league => `https://site.web.api.espn.com/apis/v2/sports/soccer/${league}/standings`;
const num = s => (s == null ? null : Number(typeof s === "object" ? s.value ?? s.displayValue : s));
const LATE = 80;
const minute = m => Number(String(m || "").match(/^(\d+)/)?.[1]) || 0;

// "2026-27 UEFA Champions League, League Phase", "Round of 16", "Final": what is at stake in the match
export function stageOf(text) {
  const t = String(text || "");
  if (/friendly/i.test(t)) return "friendly";
  if (/\bfinal\b/i.test(t) && !/semi|quarter/i.test(t)) return "final";
  if (/round of|quarter|semi|play-?off|knockout|\bleg\b/i.test(t)) return "knockout";
  return "league";
}

// The match told by its goals: the running score after each goal, from our side
export function storyOf(keyEvents, usId) {
  const goals = (keyEvents || []).filter(k => /^(goal|own goal|penalty - scored)/i.test(k.type?.text || ""))
    .map(k => {
      const own = /own goal/i.test(k.type?.text || "");
      // ESPN files an own goal under the team it counts for (checked 15 Oct 2026: Al Nassr 3-1 Neftchi)
      const forUs = String(k.team?.id) === String(usId);
      return { minute: k.clock?.displayValue || null, forUs, scorer: k.participants?.[0]?.athlete?.displayName || null, assist: own ? null : k.participants?.[1]?.athlete?.displayName || null, kind: own ? "own goal" : /penalty/i.test(k.type?.text || "") ? "penalty" : (k.type?.text || "").replace(/^Goal\s*-?\s*/i, "").toLowerCase() || null };
    });
  let us = 0, them = 0, led = false, trailed = false, decider = null;
  for (const g of goals) {
    const before = us - them;
    g.forUs ? us++ : them++;
    if (us > them) led = true;
    if (us < them) trailed = true;
    // the goal that put the eventual winner ahead for good
    if (before <= 0 && us - them > 0) decider = { ...g, side: "us" };
    if (before >= 0 && us - them < 0) decider = { ...g, side: "them" };
    g.score = `${us}-${them}`;
  }
  const reds = (keyEvents || []).filter(k => /red card/i.test(k.type?.text || "")).map(k => ({ minute: k.clock?.displayValue || null, forUs: String(k.team?.id) === String(usId), player: k.participants?.[0]?.athlete?.displayName || null }));
  return { goals, led, trailed, decider, reds };
}

function row(e, id) {
  const c = e.competitions?.[0] || {}, cs = c.competitors || [];
  const me = cs.find(x => String(x.team?.id ?? x.id) === String(id)) || {}, opp = cs.find(x => x !== me) || {};
  const st = c.status?.type || e.status?.type || {};
  return { id: e.id, date: e.date, competition: (e.league?.name || "").replace(/^Spanish /, ""), stage_text: [e.season?.name, ...(c.notes || []).map(n => n.headline || n.text)].filter(Boolean).join(" "),
    home: me.homeAway === "home", opponent: opp.team?.displayName || null, opponent_id: opp.team?.id ? String(opp.team.id) : null, venue: c.venue?.fullName || null,
    completed: !!st.completed, state: st.state || null, us: num(me.score), them: num(opp.score), shootout: me.shootoutScore != null ? { us: num(me.shootoutScore), them: num(opp.shootoutScore) } : null };
}

export async function table(league) {
  const j = await getJSON(TABLE(league));
  const entries = j.children?.[0]?.standings?.entries || j.standings?.entries || [];
  const stat = (x, n) => x.stats?.find(s => s.name === n)?.value ?? null;
  return entries.map(x => ({ id: String(x.team?.id), team: x.team?.displayName, rank: stat(x, "rank"), played: stat(x, "gamesPlayed"), points: stat(x, "points"), won: stat(x, "wins"), drawn: stat(x, "ties"), lost: stat(x, "losses"), gd: stat(x, "pointDifferential") }))
    .sort((a, b) => a.rank - b.rank);
}

// A team's results since `since` and fixtures until `until`, with each result's story and facts for the mood rules
export async function team({ espn_id: id, name, league }, { since, until }) {
  const [past, next] = await Promise.all([getJSON(`${ESPN}/all/teams/${id}/schedule`), getJSON(`${ESPN}/all/teams/${id}/schedule?fixture=true`).catch(() => ({ events: [] }))]);
  const results = (past.events || []).map(e => row(e, id)).filter(r => r.completed && r.us != null && Date.parse(r.date) >= since).sort((a, b) => a.date.localeCompare(b.date));
  const fixtures = (next.events || []).map(e => row(e, id)).filter(r => !r.completed && Date.parse(r.date) <= until && Date.parse(r.date) > Date.now() - 3 * 36e5).sort((a, b) => a.date.localeCompare(b.date));
  let tbl = null;
  if (league) tbl = await table(league).catch(() => null);
  for (const r of results) {
    const s = await getJSON(`${ESPN}/all/summary?event=${r.id}`).catch(() => null);
    const story = storyOf(s?.keyEvents, id);
    r.stage = stageOf(r.stage_text || r.competition);
    const margin = r.us - r.them, wonPens = r.shootout && r.shootout.us > r.shootout.them, lostPens = r.shootout && r.shootout.us < r.shootout.them;
    const oppRank = tbl?.find(t => t.id === r.opponent_id)?.rank ?? null, ourRank = tbl?.find(t => t.id === String(id))?.rank ?? null;
    r.goals = story.goals;
    r.reds = story.reds.filter(x => x.player);
    r.facts = {
      won: margin > 0 || !!wonPens, lost: margin < 0 || !!lostPens, drew: margin === 0 && !r.shootout,
      big: Math.abs(margin) >= 3, close: Math.abs(margin) === 1,
      came_from_behind: story.trailed && margin >= 0, lead_lost: story.led && margin <= 0,
      late_decider: !!story.decider && minute(story.decider.minute) >= LATE && story.decider.side === (margin > 0 ? "us" : "them"),
      conceded_late: story.goals.some(g => !g.forUs && minute(g.minute) >= LATE),
      red_card: story.reds.some(x => x.forUs),
      // a league defeat to a side at least eight places lower in the same table
      upset: margin < 0 && r.stage === "league" && oppRank != null && ourRank != null && oppRank - ourRank >= 8,
      eliminated: r.stage !== "league" && r.stage !== "friendly" && /\b(2nd leg|second leg|final)\b/i.test(r.stage_text) && (margin < 0 || !!lostPens),
      title: r.stage === "final" && (margin > 0 || !!wonPens),
      stage: r.stage, preseason: r.stage === "friendly",
    };
  }
  const around = tbl ? (() => { const i = tbl.findIndex(t => t.id === String(id)); return i < 0 ? null : { league, rows: tbl.slice(0, Math.max(4, i + 2)) }; })() : null;
  return { name, id: String(id), results, fixtures, table: around };
}
