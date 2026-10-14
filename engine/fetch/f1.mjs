// Formula One, from Jolpica (the Ergast API's keyless successor, as The House of 1400's Paddock Notes): the last
// round's qualifying, sprint and race when they fall in the window, the drivers' standings and the next round.
import { getJSON } from "../http.mjs";

const J = "https://api.jolpi.ca/ergast/f1";
const at = (d, t) => Date.parse(`${d}T${t || "12:00:00Z"}`);
const who = x => `${x.Driver.givenName} ${x.Driver.familyName}`;

export async function season({ since, until }) {
  const [race, sprint, quali, standings, next] = await Promise.all(["current/last/results", "current/last/sprint", "current/last/qualifying", "current/driverStandings", "current/next"].map(p => getJSON(`${J}/${p}.json`).catch(() => null)));
  const R = race?.MRData?.RaceTable?.Races?.[0], S = sprint?.MRData?.RaceTable?.Races?.[0], Q = quali?.MRData?.RaceTable?.Races?.[0];
  const sessions = [];
  if (Q && Q.QualifyingResults?.length) sessions.push({ kind: "qualifying", round: Number(Q.round), race: Q.raceName, date: Q.Qualifying ? new Date(at(Q.Qualifying.date, Q.Qualifying.time)).toISOString() : null, order: Q.QualifyingResults.map(x => ({ pos: Number(x.position), driver: who(x), id: x.Driver.driverId, team: x.Constructor.name })) });
  if (S && S.SprintResults?.length && S.round === R?.round) sessions.push({ kind: "sprint", round: Number(S.round), race: S.raceName, date: S.Sprint ? new Date(at(S.Sprint.date, S.Sprint.time)).toISOString() : null, order: S.SprintResults.map(x => ({ pos: Number(x.position), driver: who(x), id: x.Driver.driverId, team: x.Constructor.name, status: x.status })) });
  if (R) sessions.push({ kind: "race", round: Number(R.round), race: R.raceName, date: new Date(at(R.date, R.time)).toISOString(), order: R.Results.map(x => ({ pos: Number(x.position), grid: Number(x.grid), driver: who(x), id: x.Driver.driverId, team: x.Constructor.name, status: x.status, points: Number(x.points), finished: /^(Finished|\+\d+ Laps?)$/.test(x.status) })) });
  const L = standings?.MRData?.StandingsTable?.StandingsLists?.[0];
  const table = (L?.DriverStandings || []).map(x => ({ pos: Number(x.position), driver: who(x), id: x.Driver.driverId, points: Number(x.points), wins: Number(x.wins) }));
  const N = next?.MRData?.RaceTable?.Races?.[0];
  const upcoming = N ? [["first practice", N.FirstPractice], ["sprint qualifying", N.SprintQualifying || N.SprintShootout], ["sprint", N.Sprint], ["qualifying", N.Qualifying], ["race", { date: N.date, time: N.time }]]
    .filter(([, s]) => s?.date).map(([kind, s]) => ({ kind, round: Number(N.round), race: N.raceName, date: new Date(at(s.date, s.time)).toISOString() })).filter(s => Date.parse(s.date) <= until) : [];
  return { round: L ? Number(L.round) : null, sessions: sessions.filter(s => s.date && Date.parse(s.date) >= since), table, upcoming, next_race: N ? { round: Number(N.round), race: N.raceName, date: new Date(at(N.date, N.time)).toISOString() } : null };
}

// A driver's weekend in facts for the mood rules
export function driverFacts(s, id) {
  const me = s.order.find(x => x.id === id);
  if (!me) return null;
  const dnf = s.kind !== "qualifying" && me.finished === false && !/Lap/.test(me.status || "");
  return { pos: me.pos, grid: me.grid ?? null, team: me.team, status: me.status || null,
    facts: { won: me.pos === 1, podium: me.pos <= 3, dnf, finished_low: me.pos > 6, lost: false, drew: false, big: false, stage: s.kind === "race" ? "race" : s.kind, preseason: false } };
}
