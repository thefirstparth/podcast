import { intWords, ordinal } from "./audio/lib.mjs";

// The checks a script must pass before it is voiced (docs/WRITER.md). Each problem is { hard, msg }: a hard one means
// the script is never voiced; soft ones go back to the writer for a rewrite, and after the last try the script with
// the fewest soft problems is used. All code.
const words = t => String(t || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean);
const fold = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CONNECTORS = /\b(turning to|in other news|moving on|let'?s look at|let us look at|meanwhile|stay tuned)\b/i;
const WRITTEN = /\b(pivotal|underscores?|testament|landscape|delve|navigat(e|es|ing)|robust|seamless(ly)?|notably|showcas(e|es|ing))\b/i;
const BIG = ["stunning", "incredible", "historic", "sensational", "unbelievable", "masterclass", "nightmare", "epic", "extraordinary", "remarkable", "astonishing"];
const ABSENT = /\b(no (?:news|word|update|data|information|details) (?:yet |so far )?(?:on|about|from)|nothing (?:yet|so far) (?:on|about|from)|(?:not|isn't|hasn't been|haven't been|yet to be) (?:announced|confirmed|known) yet|yet to be (?:announced|confirmed)|we don't (?:know|have) (?:yet|anything)|no idea (?:yet )?(?:where|when|which)|nothing to report)\b/i;
const PROCESS = /\b(sources?|the pack|data pack|script|prompt|rundown|we checked|according to our|feeds?)\b/i;
const PERSONAL = /\b(injur(y|ed|ies)|hamstring|knee|ankle|surgery|ill|illness|sick|hospital|died|death|family|wife|baby|funeral|grief)\b/i;
const SAD = new Set(["gutted", "angry", "heartbroken", "frustrated"]);

// The lines that tell an old result again, outside Coming up: one whose score and a name come from a line already told
// or from a result before the window; or one that names a subject's earlier opponent or tennis tournament (old_marks)
// and reads like a result. Decided by code alone.
const OLDRESULT = /\b(\d+-\d+|beat|beats|beaten|lose|loses|lost|loss|defeat|defeated|exit|exits|crash(?:es|ed)? out|knocked out|dumped out|eliminated|stunned|shock exit|upset)\b/i;
export function oldNewsTurns(turns, pack) {
  const out = [], olds = (pack.old_news || []).map(o => { const line = o.replace(/^\d{4}-\d{2}-\d{2}: /, ""); return { o, scores: line.match(/\b\d+-\d+\b/g), names: (line.match(/\b[A-Z][a-z]{3,}\b/g) || []).filter(w => !/^(Real|Madrid|India|Golden|State|Warriors|Preseason|Formula|Rolex|Masters|Round)$/.test(w)) }; }).filter(x => x.scores && x.names.length);
  // (a mark counts only with the subject named in the same line: an earlier opponent or tournament is someone else's
  // news too. 18 Oct: "Jodar stunned Medvedev", today's Shanghai semi-final, was taken for Djokovic's old match)
  const marks = Object.entries(pack.old_marks || {}).flatMap(([who, ms]) => ms.map(m => ({ rx: new RegExp(`\\b${m.replace(/^@/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), who: new RegExp(`\\b${who.replace(/ (men|women)$/i, "").split(/\s+/).at(-1)}\\b`, "i") })));
  turns.forEach((t, i) => {
    if (t.segment === "ahead") return;
    // (a score either way round: "AS Roma 3-4 Real Madrid" is "4-3 to Madrid" when the Fan says it)
    // (the whole score, in order: one set or one scoreline shared with today's news is not enough)
    const flat = t.text.replace(/,\s*/g, " "), has = seq => flat.includes(seq.join(" ")) || flat.includes(seq.map(sc => sc.split("-").reverse().join("-")).join(" "));
    const s = olds.find(x => has(x.scores) && x.names.some(n => t.text.includes(n)));
    if (s) return out.push({ i, why: s.o });
    if (OLDRESULT.test(t.text) && marks.some(m => m.rx.test(t.text) && m.who.test(t.text))) out.push({ i, why: `${t.text.slice(0, 60)}...` });
  });
  return out;
}

// Numbers as the script writes them, in figures or in words ("twenty-seven", "four-one"), and clock times left out
const NUMWORD = new Map(Array.from({ length: 200 }, (_, n) => [intWords(n), n]));
const NUMRX = new RegExp(`\\b(${[...NUMWORD.keys()].sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");
const numbersIn = s => {
  const t = s.replace(/\b\d{1,2}(?::\d{2})?\s*[ap]\.?\s?m\b/gi, " ").replace(/,(?=\d{3}\b)/g, "");
  return [...(t.match(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g) || []).map(Number), ...[...t.toLowerCase().matchAll(NUMRX)].map(m => NUMWORD.get(m[1]))].filter(n => n > 1);
};
const NOTNAME = new Set(["I", "I'm", "I've", "I'd", "OK", "Okay", "Oh", "Right", "Yes", "No", "And", "But", "Then", "Here", "Now", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
const namesIn = s => new Set([...s.matchAll(/(?<![.!?]\s|^)\b([A-Z][\wà-ÿ'’]{2,})/g)].map(m => m[1].replace(/['’]s$/, "")).filter(w => !NOTNAME.has(w)));
const sentencesOf = text => text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [];

// The same fact told twice (19 Oct: India's tour, "two Tests, five ODIs, five T20Is", in the cricket story and again
// in "where things stand"; Antonelli "102 ahead of Russell" the same way). A sentence repeats an earlier one in another
// turn when they share two numbers and a name, or one number above twelve and two names. The cold open is a teaser
// told again on purpose and is left out. `whole`: every number and name in the later sentence was already said, so it
// adds nothing and code takes it out (writer.mjs); otherwise it goes back to the writer. Decided by code alone.
export function repeats(turns) {
  const said = [], out = [];
  turns.forEach((t, i) => {
    if (t.segment === "cold-open" || t.segment === "signoff") return;
    for (const s of sentencesOf(t.text)) {
      const nums = numbersIn(s), names = namesIn(s);
      const hit = said.find(x => x.i !== i && (() => {
        const n = nums.filter(v => x.nums.includes(v)), m = [...names].filter(v => x.names.has(v));
        return (new Set(n).size >= 2 && m.length >= 1) || (n.some(v => v > 12) && m.length >= 2);
      })());
      if (hit && !/\?\s*$/.test(s)) {
        const before = { nums: said.flatMap(x => x.nums), names: new Set(said.flatMap(x => [...x.names])) };
        out.push({ i, sentence: s, first: hit.s, whole: nums.every(v => before.nums.includes(v)) && [...names].every(v => before.names.has(v)) });
      }
      said.push({ i, s, nums, names });
    }
  });
  return out;
}

// A red card talked about in a match where none was shown (19 Oct: "Sevilla were demanding a red card after an
// altercation between Güler and Peque Fernández" was heard as Güler sent off). Allowed when the data has a red card,
// or the line says it was not given.
const REDCARD = /\b(red card|red-card|sent off|sending off|sending-off|ten men|10 men)\b/i;
const NOTGIVEN = /\b(no red|not sent off|wasn't sent off|weren't sent off|never sent off|stayed on|escaped|got away with|let (?:it|him|that) go|let off|no card|only a yellow|just a yellow|not given|wasn't given|didn't give|did not give|waved (?:it )?away|gave nothing|no action)\b/i;
export function redCardTurns(turns, pack) {
  const games = (pack.items || []).filter(i => Array.isArray(i.reds) && !i.reds.length && i.line)
    .map(i => (i.line.match(/^(.+?)\s+\d+-\d+\s+(.+)$/) || []).slice(1).filter(Boolean)).filter(x => x.length);
  const out = [];
  turns.forEach((t, i) => {
    for (const s of sentencesOf(t.text)) if (REDCARD.test(s) && !NOTGIVEN.test(s) && games.some(g => g.some(team => fold(s).includes(fold(team))))) out.push({ i, sentence: s });
  });
  return out;
}

// Goals told in the order they happened (19 Oct: Parth heard the third goal after the fourth). Minutes said in one
// segment of the show must not go back.
const ORD = new Map(Array.from({ length: 121 }, (_, n) => [ordinal(n), n]).slice(1));
const ORDRX = new RegExp(`\\b(${[...ORD.keys()].sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");
export function minutesIn(s) {
  const t = s.toLowerCase().replace(ORDRX, w => `${ORD.get(w)}th`).replace(NUMRX, w => String(NUMWORD.get(w)));
  const out = [];
  for (const m of t.matchAll(/\b(?:(\d{1,3})(?:st|nd|rd|th)?[- ]minute(?!s? (?:later|left|to go|remaining|after|from|of|on the clock|before))|on (\d{1,3}) minutes|(\d{1,3}) minutes in|in the ([5-9]|\d{2,3})th\b(?! (?:quarter|over|round|set|game|hole|lap|inning))|(just )?before (the hour|half-?time|the break)|(stoppage|injury) time)/g)) {
    const v = Number(m[1] || m[2] || m[3] || m[4]) || (m[6] ? (/hour/.test(m[6]) ? 58 : 44) : m[7] ? 90 : null);
    if (v) out.push({ at: m.index, v });
  }
  return out.sort((a, b) => a.at - b.at).map(x => x.v);
}
export function minutesOutOfOrder(turns) {
  let seg = null, last = 0;
  for (const t of turns) {
    if (t.segment !== seg) { seg = t.segment; last = 0; }
    for (const v of minutesIn(t.text)) { if (v < last) return `${v} after ${last}: "${t.text.slice(0, 60)}"`; last = v; }
  }
  return null;
}

export function checkScript(turns, pack, { hosts = ["Fan", "Anchor"], rivals = [], listener = "" } = {}) {
  const P = [], hard = msg => P.push({ hard: true, msg }), soft = msg => P.push({ hard: false, msg });
  if (!Array.isArray(turns) || turns.length < 8) { hard("fewer than eight turns"); return P; }
  const all = turns.map(t => t.text).join(" "), n = words(all).length;
  if (n > pack.max_words) hard(`${n} words, over the ${pack.max_words} maximum: cut quick items to a line each`);
  if (n < pack.words * 0.6) soft(`${n} words, well short of the planned ${pack.words}: give the die-hard results their full time`);
  // the plan is the length (Parth, 15 Oct: 8 minutes planned, 9 min 46 s on air): well past it goes back for a trim
  else if (n > pack.words * 1.1) soft(`${n} words, over the planned ${pack.words}: trim to about ${pack.words}, keeping the die-hard results whole and cutting quick items first`);
  if (turns.some(t => !hosts.includes(t.speaker))) hard(`speakers must be ${hosts.join(" and ")}`);
  // rivals: only in Rival Watch, a same-day double in the cold open, or the table line after a league result
  const tableHasRival = pack.items.some(i => i.table?.rows?.some(r => r.rival));
  const doubles = pack.items.some(i => i.double);
  // a die-hard story that itself names the rival ("Vinicius to miss the Clasico against Barcelona") may be told as it is
  const inStories = r => pack.running_order.filter(s => s.id === "die-hard").flatMap(s => s.news || []).some(n => [n.headline, n.text?.text].join(" ").includes(r.name));
  for (const r of rivals) {
    const rx = new RegExp(`\\b(${[r.name, ...(r.aliases || [])].map(fold).join("|")})\\b`, "i");
    for (const t of turns.filter(t => rx.test(fold(t.text)))) {
      const ok = t.segment === "rival-watch" || (t.segment === "die-hard" && inStories(r)) || (t.segment === "cold-open" && doubles) || (t.segment === "die-hard" && tableHasRival) || /\bclasico\b/i.test(fold(t.text)) && t.segment === "ahead";
      if (!ok) hard(`${r.name} named outside Rival Watch: "${t.text.slice(0, 80)}"`);
      if (PERSONAL.test(t.text)) hard(`a rival's personal or injury news: "${t.text.slice(0, 80)}"`);
    }
  }
  for (const t of turns) {
    if (SAD.has(t.mood) && /<laugh>|\bhaha\b|\blol\b/i.test(t.text)) hard(`laughter in a ${t.mood} moment: "${t.text.slice(0, 60)}"`);
    if (CONNECTORS.test(t.text)) soft(`stock connector "${t.text.match(CONNECTORS)[0]}": change the subject the way friends do`);
    if (WRITTEN.test(t.text)) soft(`"${t.text.match(WRITTEN)[0]}" is a written word nobody says out loud`);
    if (PROCESS.test(t.text)) soft(`talks about how the show is made ("${t.text.match(PROCESS)[0]}")`);
    // what is not known is left out, never announced (Parth, 15 Oct: no data, no line)
    if (ABSENT.test(t.text)) soft(`talks about something not known ("${t.text.match(ABSENT)[0]}"): leave it out`);
    if (listener && new RegExp(`\\b${listener}\\b`, "i").test(t.text)) soft("the listener is addressed by name");
  }
  for (const w of BIG) { const k = (fold(all).match(new RegExp(`\\b${w}\\b`, "g")) || []).length; if (k > 1) soft(`"${w}" used ${k} times: once an episode, earned`); }
  // every name the hosts use must be in the pack (a capitalised word not at the start of a sentence)
  // what the writer was given (pack.known), not the whole pack: a name that sits only in a story left out (15 Oct: a
  // hat-trick given to the wrong player, his name only in a match not used) is still a name the writer added
  const known = fold(pack.known || JSON.stringify(pack)), skip = new Set(["I", "I'm", "I've", "I'd", "OK", "Okay", "Oh", "Right", "Yes", "No", "God", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Champions", "League", "Grand", "Prix", ...hosts]);
  const unknown = new Set();
  for (const t of turns) for (const m of t.text.matchAll(/(?<![.!?]\s|^)\b([A-Z][a-zà-ÿ'’]+)/g)) { const w = m[1].replace(/['’]s$/, ""); if (!skip.has(w) && w.length > 2 && !known.includes(fold(w))) unknown.add(w); }
  if (unknown.size) soft(`names not in the pack (never add a fact or a name): ${[...unknown].slice(0, 10).join(", ")}`);
  // an old result told again as news (18 Oct): see oldNewsTurns; the writer is asked to fix it, and code takes out any
  // such line that is left (writer.mjs), so it never depends on the writer
  const olds = oldNewsTurns(turns, pack);
  if (olds.length) soft(`tells old news again ("${olds[0].why}"): today's stories only`);
  // every clock time must be one the writer was given, with the same am or pm (17 Oct: a kick-off at 00:30 said as
  // "Monday morning at 12:30 AM", and the old voicing turned "11:00 PM" into "eleven a m")
  const clockOf = x => { const m = x.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\b/i); return m ? `${Number(m[1])}:${m[2] || "00"} ${m[3].toLowerCase()}m` : null; };
  const clocks = t => (t.match(/\b\d{1,2}(?::\d{2})?\s*[ap]\.?\s?m\b/gi) || []).map(clockOf);
  const givenClocks = new Set(clocks(String(pack.known || JSON.stringify(pack))));
  const badClocks = new Set(turns.flatMap(t => clocks(t.text)).filter(c => !givenClocks.has(c)));
  if (badClocks.size) soft(`times not as given (say each time exactly as its "when"): ${[...badClocks].join(", ")}`);
  // every number the hosts say in figures must be one they were given (16 Oct: "56 off 20 balls" for a fifty in 20)
  const num = n => String(Number(n)), given = new Set((String(pack.known || JSON.stringify(pack)).match(/\d+(?:\.\d+)?/g) || []).map(num));
  const odd = new Set(turns.flatMap(t => t.text.match(/\d+(?:\.\d+)?/g) || []).map(num).filter(n => !given.has(n)));
  if (odd.size) soft(`numbers not in the pack (never add a fact or a number): ${[...odd].slice(0, 10).join(", ")}`);
  const twice = repeats(turns);
  if (twice.length) soft(`says the same thing twice ("${twice[0].sentence.slice(0, 70)}" was already said): say each fact once, and in "where things stand" only what the show has not said`);
  const reds = redCardTurns(turns, pack);
  if (reds.length) soft(`a red card no one was shown ("${reds[0].sentence.slice(0, 70)}"): no red card was given in that match, so say plainly that it was not given`);
  const order = minutesOutOfOrder(turns);
  if (order) soft(`a match told out of order (minute ${order}): tell the goals and moments in the order they happened`);
  // the running order, as planned
  const plan = pack.running_order.map(s => s.id), seen = [...new Set(turns.map(t => t.segment))];
  const missing = plan.filter(s => !seen.includes(s));
  if (missing.length) soft(`segments missing: ${missing.join(", ")}`);
  if (seen.filter(s => plan.includes(s)).join() !== plan.filter(s => seen.includes(s)).join()) soft(`segments out of order: ${seen.join(" > ")}`);
  return P;
}
