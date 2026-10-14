// Tennis, from ESPN's keyless ATP (and WTA) scoreboard (as The House of 1400's Deuce): every match a followed player
// played in the window, his next match if he is still in a draw, and the big matches (semi-finals and finals) of the
// tournaments on now.
import { getJSON } from "../http.mjs";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/tennis";
const key = n => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function board(tour = "atp") {
  const j = await getJSON(`${ESPN}/${tour}/scoreboard`);
  const out = [];
  for (const e of j.events || []) for (const g of e.groupings || []) {
    if (!/singles/i.test(g.grouping?.displayName || "")) continue;
    for (const c of g.competitions || []) {
      const p = (c.competitors || []).map(x => ({ name: x.athlete?.displayName, won: !!x.winner, sets: (x.linescores || []).map(l => l.value), seed: x.seed || null }));
      out.push({ id: c.id, tournament: e.name, draw: g.grouping.displayName, round: c.round?.displayName || null, date: c.date, state: c.status?.type?.state, note: c.notes?.[0]?.text || null, players: p });
    }
  }
  return out;
}

export function player(matches, name, { since, until }) {
  const k = key(name), mine = matches.filter(m => m.players.some(p => key(p.name) === k));
  const results = mine.filter(m => m.state === "post" && Date.parse(m.date) >= since).map(m => {
    const me = m.players.find(p => key(p.name) === k), opp = m.players.find(p => p !== me);
    const final = /^final$/i.test(m.round || ""), semi = /semi/i.test(m.round || ""), sets = me.sets.map((s, i) => `${s}-${opp.sets[i]}`).join(" ");
    return { ...m, opponent: opp.name, score: m.note || sets, facts: { won: me.won, lost: !me.won, drew: false, eliminated: !me.won, title: me.won && final, big: false, upset: !me.won && !opp.seed && !!me.seed, stage: final ? "final" : semi ? "knockout" : "round", preseason: false } };
  });
  const next = mine.filter(m => m.state !== "post" && Date.parse(m.date) <= until).map(m => ({ ...m, opponent: m.players.find(p => key(p.name) !== k)?.name || "TBC" }));
  return { name, results, fixtures: next };
}

// Semi-finals and finals of the tournaments on now, whoever played
export const bigMatches = (matches, { since }) => matches.filter(m => m.state === "post" && Date.parse(m.date) >= since && /^(final|semifinal|semi-final|semifinals)$/i.test(m.round || ""));
