// The NBA, from ESPN's keyless site API (as The House of 1400's Fixture List): a team's games, pre-season marked.
import { getJSON } from "../http.mjs";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const num = s => (s == null ? null : Number(typeof s === "object" ? s.value ?? s.displayValue : s));

export async function team({ espn_abbr: abbr, name }, { since, until }) {
  const lists = await Promise.all([1, 2, 3].map(t => getJSON(`${ESPN}/teams/${abbr}/schedule?seasontype=${t}`).catch(() => ({ events: [] }))));
  const games = new Map();
  for (const j of lists) for (const e of j.events || []) {
    const c = e.competitions?.[0] || {}, cs = c.competitors || [];
    const me = cs.find(x => x.team?.abbreviation?.toLowerCase() === abbr.toLowerCase()) || {}, opp = cs.find(x => x !== me) || {};
    const st = c.status?.type || {};
    games.set(e.id, { id: e.id, date: e.date, kind: e.seasonType?.name || null, home: me.homeAway === "home", opponent: opp.team?.displayName || null, completed: !!st.completed, us: num(me.score), them: num(opp.score) });
  }
  const all = [...games.values()].sort((a, b) => a.date.localeCompare(b.date));
  const results = all.filter(g => g.completed && Date.parse(g.date) >= since);
  for (const g of results) {
    const m = g.us - g.them;
    g.facts = { won: m > 0, lost: m < 0, drew: false, big: Math.abs(m) >= 15, close: Math.abs(m) <= 5, stage: /playoff/i.test(g.kind) ? "knockout" : "league", preseason: /pre/i.test(g.kind || "") };
  }
  const fixtures = all.filter(g => !g.completed && Date.parse(g.date) <= until && Date.parse(g.date) > Date.now() - 3 * 36e5);
  return { name, results, fixtures };
}
