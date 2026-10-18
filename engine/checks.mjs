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
  // the running order, as planned
  const plan = pack.running_order.map(s => s.id), seen = [...new Set(turns.map(t => t.segment))];
  const missing = plan.filter(s => !seen.includes(s));
  if (missing.length) soft(`segments missing: ${missing.join(", ")}`);
  if (seen.filter(s => plan.includes(s)).join() !== plan.filter(s => seen.includes(s)).join()) soft(`segments out of order: ${seen.join(" > ")}`);
  return P;
}
