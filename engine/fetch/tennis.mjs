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

// The tournaments starting in the next three weeks (ESPN's scoreboard by date), with the players in each draw once it
// is out. Before the draw, nobody is listed: no free source says who has entered, so a player's next tournament is
// known only from the draw.
export async function calendar(tour = "atp", weeks = 3) {
  const day = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10).replace(/-/g, "");
  const boards = await Promise.all(Array.from({ length: weeks + 1 }, (_, k) => getJSON(`${ESPN}/${tour}/scoreboard?dates=${day(k * 7)}`).catch(() => ({ events: [] }))));
  const ev = new Map();
  for (const j of boards) for (const e of j.events || []) {
    if (ev.has(e.name)) continue;
    const players = new Set();
    for (const g of e.groupings || []) if (/singles/i.test(g.grouping?.displayName || "")) for (const c of g.competitions || []) for (const x of c.competitors || []) if (x.athlete?.displayName) players.add(x.athlete.displayName);
    ev.set(e.name, { name: e.name, start: e.date, end: e.endDate || null, players: [...players] });
  }
  return [...ev.values()].sort((a, b) => a.start.localeCompare(b.start));
}

// Semi-finals and finals of the tournaments on now, whoever played
export const bigMatches = (matches, { since }) => matches.filter(m => m.state === "post" && Date.parse(m.date) >= since && /^(final|semifinal|semi-final|semifinals)$/i.test(m.round || ""));

// The tour's ranked players (ESPN), so "Men's tennis" means stories about the men's tour: a story must name one of them
export async function rankings(tour = "atp") {
  const j = await getJSON(`${ESPN}/${tour}/rankings`);
  return (j.rankings?.[0]?.ranks || []).map(r => r.athlete?.displayName).filter(Boolean);
}
