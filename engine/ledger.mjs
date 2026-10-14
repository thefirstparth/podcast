// What the show has already said, so tomorrow's episode never repeats it (Parth, 15 Oct). All code, no AI:
//   results by their fixed ids (the ESPN or Cricbuzz match id, the F1 round and session), which never change;
//   news by its links and its headline's words: a new headline sharing half its words with one already said is the
//   same story; a genuinely new turn (a reaction, an update) uses different words and gets through.
// Only a published episode is recorded (the episode run calls record); rehearsals read the ledger but never write it.
// The next window starts from the last published episode, so a missed day is caught up (up to four days).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const H = new URL("../", import.meta.url).pathname, FILE = `${H}ledger/said.json`, KEEP_DAYS = 14;
const words = t => [...new Set(String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2))];
const overlap = (a, b) => { const B = new Set(b); let n = 0; for (const w of a) if (B.has(w)) n++; return n / Math.min(a.length || 1, b.length || 1); };

export function load(file = FILE) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return { episodes: [] }; }
}
export const lastPublished = L => L.episodes.map(e => Date.parse(e.published_at)).filter(Boolean).sort((a, b) => b - a)[0] || null;

const saidResults = L => new Set(L.episodes.flatMap(e => e.results || []));
const saidNews = L => L.episodes.flatMap(e => e.news || []);
export const resultSaid = (L, id) => saidResults(L).has(id);
export function newsSaid(L, cluster) {
  const urls = new Set((cluster.links || []).map(l => l.url)), w = words(cluster.headline);
  return saidNews(L).some(n => (n.urls || []).some(u => urls.has(u)) || overlap(w, n.w) >= 0.5);
}

// After an episode is published: everything it was given to say
export function record(pack, { file = FILE, published_at = new Date().toISOString() } = {}) {
  const L = load(file), said = new Set(pack.running_order.flatMap(s => s.items || []));
  const news = pack.running_order.flatMap(s => [...(s.news || []), ...(s.elsewhere || [])]).map(n => ({ h: n.headline || n.line, w: words(n.headline || n.line), urls: (n.links || []).map(l => l.url).slice(0, 6) }));
  const reports = pack.items.filter(i => said.has(i.id)).flatMap(i => (i.reports || []).map(r => ({ h: r.headline, w: words(r.headline), urls: [] })));
  const cut = Date.now() - KEEP_DAYS * 864e5;
  L.episodes = [...L.episodes.filter(e => Date.parse(e.published_at) > cut), { published_at, results: [...said, ...pack.running_order.flatMap(s => (s.elsewhere || []).map(c => c.id))], news: [...news, ...reports] }];
  mkdirSync(`${H}ledger`, { recursive: true });
  writeFileSync(file, JSON.stringify(L, null, 1));
  return L;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "--record") {
  const pack = JSON.parse(readFileSync(process.argv[3], "utf8"));
  const L = record(pack);
  console.log(`ledger: ${L.episodes.length} episode(s) kept`);
}
