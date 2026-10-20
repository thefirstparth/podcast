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

// The Fan's own calls (Parth, 15 Oct: "Dhruv remembers what Kylo said before it happened"): his lines about what is
// coming, kept so the next episode's Anchor can quote them back
// (his own prediction, never a report of what someone else said: 17 Oct, Dhruv quoted back Kylo's summary of what
// Vinicius said, because it had "will" in it)
const CALLS = /\b(I (?:think|bet|reckon|guarantee|predict|promise|tell you|am telling you|swear)|mark my words|you watch|no way|(?:going to|gonna|will|they'll|he'll|we'll) (?:win|lose|beat|score|bounce back|walk it|crush|take|smash|do it))\b/i;
const REPORTED = /\b(said|says|told|spoke|acknowledged|admitted|claims?|feels|according to|reports?)\b/i;
export const lastCalls = L => L.episodes.at(-1)?.fan_said || [];
// what the last few episodes told (the newest first), each line with its day
export const lastTold = (L, n = 3) => L.episodes.slice(-n).reverse().flatMap(e => (e.told || []).map(line => `${String(e.published_at).slice(0, 10)}: ${line}`));
export const lastSpoken = (L, n = 3) => L.episodes.slice(-n).flatMap(e => e.spoken || []);
// A sentence of a story that says again what an episode already said: most of its words (names among them) are in one
// line the hosts said. Code alone; the story keeps whatever is new.
const STOPW = new Set("about after again against also back been before being both could didn't does down even every first from going have here into it's just last least like made make many more most much next only other over really right said says season since some still than that their them then there these they this those though three through time told under until very want week well were what when where which while will with would year years your".split(" "));
const content = t => new Set((String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z']{4,}/g) || []).filter(w => !STOPW.has(w)));
export function saidAgain(sentence, spoken) {
  // word stems (four letters: "limped" and "limping" are one), compared with a stretch of three lines the hosts said in
  // a row, one of them naming someone the sentence names; close to half its words, five at least, is said again
  const stems = t => new Set([...content(t)].map(w => w.slice(0, 4)));
  const S = stems(sentence);
  if (S.size < 6) return false;
  const nm = t => new Set((String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/\b[A-Z][a-z]{3,}/g) || []).map(w => w.toLowerCase()).filter(w => !STOPW.has(w)));
  const mine = nm(sentence);
  return spoken.some((line, i) => {
    if (![...nm(line)].some(w => mine.has(w))) return false;
    return [spoken.slice(Math.max(0, i - 2), i + 1), spoken.slice(i, i + 3)].some(win => { const T = stems(win.join(" ")), both = [...S].filter(w => T.has(w)); return both.length >= 5 && both.length / S.size >= 0.45; });
  });
}
export function record(pack, { file = FILE, published_at = new Date().toISOString(), turns = [], fan = null } = {}) {
  const L = load(file), cut = Date.now() - KEEP_DAYS * 864e5;
  const results = [...pack.running_order.flatMap(s => s.items || []), ...pack.running_order.flatMap(s => (s.elsewhere || []).map(c => c.id))];
  const urls = pack.running_order.flatMap(s => [...(s.news || []), ...(s.elsewhere || [])]).flatMap(n => [...(n.links || []).map(l => l.url), n.text?.url, n.report?.url]).filter(Boolean);
  // a call is a claim, never a question (15 Oct: "What is on our calendar?" was kept, and quoted back as if it were one)
  const fan_said = turns.filter(t => t.speaker === fan && !/\?\s*$/.test(t.text) && CALLS.test(t.text) && !REPORTED.test(t.text) && t.text.split(/\s+/).length >= 5).map(t => t.text).slice(-8);
  // what the episode told, in plain lines, for the next episodes' writer: old news is never told again as news (18 Oct)
  const it = id => (pack.items || []).find(i => i.id === id);
  const told = [...new Set([...pack.running_order.flatMap(s => (s.items || []).map(id => it(id)?.line).filter(Boolean)), ...pack.running_order.flatMap(s => (s.news || []).map(n => n.headline)), ...pack.running_order.flatMap(s => (s.elsewhere || []).map(c => c.line))])].slice(0, 40);
  // and what the hosts actually said about it (20 Oct: "Curry expected to play" was a new headline, and its text retold
  // the ankle scare from the day before): the next episodes' stories lose the sentences that say it again
  const spoken = turns.filter(t => !["ahead", "signoff", "cold-open"].includes(t.segment)).map(t => t.text).slice(0, 80);
  L.episodes = [...L.episodes.filter(e => Date.parse(e.published_at) > cut), { published_at, results, urls, fan_said, told, spoken }];
  write(file, L);
  return L;
}

export const squads = () => read(`${DIR}/squads.json`, {});
export const saveSquads = s => write(`${DIR}/squads.json`, s);

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "--record") {
  const L = record(JSON.parse(readFileSync(process.argv[3], "utf8")));
  console.log(`ledger: ${L.episodes.length} episode(s) kept`);
}
