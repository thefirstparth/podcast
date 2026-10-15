// Find the ids a profile.json entry needs, by name, from the same sources the show reads (no keys, no AI). For a
// friend making their own show: run it for each team or player, check the match, paste the entry into profile.json,
// then add aliases (the words headlines use) and set care (die-hard, follow or big-moments).
//   node scripts/find-ids.mjs "Arsenal"
//   node scripts/find-ids.mjs "Lando Norris" --sport=f1
//   node scripts/find-ids.mjs "Australia" --sport=cricket
// Sports: football, cricket, f1, tennis, basketball (the NBA). Without --sport, every sport is searched.
import { ensureProxy, getJSON, getText } from "../engine/http.mjs";

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
const q = process.argv.slice(2).find(a => !a.startsWith("--"));
const only = arg("sport");
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const want = s => !only || only === s;

async function sofa(q) {
  const j = await getJSON(`https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(q)}&page=0`).catch(() => ({ results: [] }));
  return (j.results || []).map(r => ({ type: r.type, id: r.entity?.id, name: r.entity?.name, sport: r.entity?.sport?.slug || r.entity?.team?.sport?.slug || null, gender: r.entity?.gender || null }));
}
// the backup source's id only when the name matches exactly (a near miss is left empty to fill by hand)
const sofaFor = (list, name, sport) => list.find(r => r.type === "team" && r.sport === sport && r.gender !== "F" && fold(r.name) === fold(name))?.id ?? null;

export async function findIds(q) {
  const out = [], ss = await sofa(q);
  // football clubs and national sides, and NBA teams: ESPN's search
  if (want("football") || want("basketball")) {
    const s = await getJSON(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=6`).catch(() => ({ results: [] }));
    const teams = (s.results || []).filter(r => r.type === "team").flatMap(r => r.contents || []);
    for (const t of teams.slice(0, 4)) {
      const id = Number(String(t.uid).match(/~t:(\d+)/)?.[1]);
      if (!id) continue;
      if (t.sport === "soccer" && want("football") && !/\.w\./.test(t.defaultLeagueSlug || ""))
        out.push({ sport: "football", kind: "team", name: t.displayName, espn_id: id, league: t.defaultLeagueSlug || null, care: "follow", aliases: [t.displayName], sofascore_id: sofaFor(ss, t.displayName, "football"), search: t.displayName, _where: t.subtitle });
      if (t.sport === "basketball" && t.defaultLeagueSlug === "nba" && want("basketball")) {
        const abbr = (await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}`).catch(() => null))?.team?.abbreviation?.toLowerCase() || null;
        out.push({ sport: "basketball", kind: "team", name: t.displayName, espn_abbr: abbr, care: "follow", aliases: [t.displayName], sofascore_id: sofaFor(ss, t.displayName, "basketball"), search: t.displayName.split(" ").at(-1), _where: "NBA" });
      }
    }
  }
  // international cricket sides: Cricbuzz's list of teams
  if (want("cricket")) {
    const html = await getText("https://www.cricbuzz.com/cricket-team").catch(() => "");
    const seen = new Set();
    for (const m of html.matchAll(/cricket-team\/([a-z-]+)\/(\d+)/g)) {
      const name = m[1].split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      if (seen.has(name) || fold(name) !== fold(q.replace(/ (men|women)$/i, ""))) continue;
      seen.add(name);
      out.push({ sport: "cricket", kind: "team", name: `${name} men`, cricbuzz_id: Number(m[2]), care: "follow", aliases: [name], not: [`${name} A`, `${name} U19`], sofascore_id: sofaFor(ss, name, "cricket"), skip: ["women", "women's"], _where: "Cricbuzz" });
    }
  }
  // F1 drivers on this season's grid: Jolpica
  if (want("f1")) {
    const d = await getJSON("https://api.jolpi.ca/ergast/f1/current/drivers.json?limit=100").catch(() => null);
    for (const x of d?.MRData?.DriverTable?.Drivers || []) {
      const name = `${x.givenName} ${x.familyName}`;
      if (!fold(name).includes(fold(q)) && !fold(q).includes(fold(x.familyName))) continue;
      out.push({ sport: "f1", kind: "driver", name, jolpica_id: x.driverId, care: "follow", aliases: [x.familyName], search: x.familyName, _where: "this season's grid" });
    }
  }
  // tennis players: Sofascore (ESPN's scoreboard finds them by name)
  if (want("tennis")) for (const r of ss.filter(r => r.type === "player" && r.sport === "tennis").slice(0, 3))
    out.push({ sport: "tennis", kind: "player", name: r.name, care: "follow", aliases: [r.name.split(" ").at(-1)], sofascore_id: r.id, search: r.name.split(" ").at(-1), _where: "Sofascore" });
  // a tennis player's search result is a "team" in Sofascore when it has no sport on the player; check both
  if (want("tennis") && !out.some(o => o.sport === "tennis")) for (const r of ss.filter(r => r.type === "team" && r.sport === "tennis").slice(0, 3))
    out.push({ sport: "tennis", kind: "player", name: r.name, care: "follow", aliases: [r.name.split(" ").at(-1)], sofascore_id: r.id, search: r.name.split(" ").at(-1), _where: "Sofascore" });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!q) { console.log('Usage: node scripts/find-ids.mjs "Team or player" [--sport=football|cricket|f1|tennis|basketball]'); process.exit(1); }
  ensureProxy();
  const found = await findIds(q);
  if (!found.length) { console.log(`Nothing found for "${q}". Try the full name, or another spelling.`); process.exit(1); }
  for (const f of found) { const { _where, ...entry } = f; console.log(`\n${f.sport}: ${f.name} (${_where || ""})\n${JSON.stringify(entry, null, 2)}`); }
}
