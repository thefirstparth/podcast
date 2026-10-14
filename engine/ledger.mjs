// What the show has already said, so the next episode does not repeat it (Parth, 15 Oct). Kept simple on purpose,
// and it leans towards saying a thing twice rather than missing it ("I would rather hear something about it in two
// consecutive podcasts than miss something important"):
//   a result is remembered by its fixed id (the ESPN or Cricbuzz match id, the F1 round and session), so a result
//   already told is never told again as news; it can still be mentioned as background to something new;
//   a story is remembered only by its links: the very same article is not used twice. A follow-up from the next day
//   (a reaction, a ban, an update) is always new.
// Only a published episode is recorded (the episode run calls record); rehearsals read it but never write it.
// The next window starts from the last published episode, so a missed day is caught up (up to four days).
// The same folder keeps the last squad that loaded for each followed team, for the day ESPN is down.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const H = new URL("../", import.meta.url).pathname, DIR = `${H}ledger`, FILE = `${DIR}/said.json`, KEEP_DAYS = 7;
const read = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
const write = (f, v) => { mkdirSync(DIR, { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 1)); };

export const load = (file = FILE) => read(file, { episodes: [] });
export const lastPublished = L => L.episodes.map(e => Date.parse(e.published_at)).filter(Boolean).sort((a, b) => b - a)[0] || null;
export const resultSaid = (L, id) => L.episodes.some(e => (e.results || []).includes(id));
export const newsSaid = (L, cluster) => { const urls = new Set((cluster.links || []).map(l => l.url)); return L.episodes.some(e => (e.urls || []).some(u => urls.has(u))); };

export function record(pack, { file = FILE, published_at = new Date().toISOString() } = {}) {
  const L = load(file), cut = Date.now() - KEEP_DAYS * 864e5;
  const results = [...pack.running_order.flatMap(s => s.items || []), ...pack.running_order.flatMap(s => (s.elsewhere || []).map(c => c.id))];
  const urls = pack.running_order.flatMap(s => [...(s.news || []), ...(s.elsewhere || [])]).flatMap(n => [...(n.links || []).map(l => l.url), n.text?.url, n.report?.url]).filter(Boolean);
  L.episodes = [...L.episodes.filter(e => Date.parse(e.published_at) > cut), { published_at, results, urls }];
  write(file, L);
  return L;
}

export const squads = () => read(`${DIR}/squads.json`, {});
export const saveSquads = s => write(`${DIR}/squads.json`, s);

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "--record") {
  const L = record(JSON.parse(readFileSync(process.argv[3], "utf8")));
  console.log(`ledger: ${L.episodes.length} episode(s) kept`);
}
