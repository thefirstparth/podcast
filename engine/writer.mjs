// The writer: Gemini turns the day's pack into a conversation between the Fan and the Anchor, by the rules in
// docs/WRITER.md, and code checks it (engine/checks.mjs). A script with problems goes back with the reasons; the best
// one with no hard problem is kept. Rehearsal (Parth, 14-15 Oct): the rehearsal key only, at most three writer
// requests, no voice, nothing published; the pack, the script and the checks are written to rehearsals/ for him.
//   GEMINI_KEY_REHEARSAL=... node engine/writer.mjs --rehearse [--days=1] [--models]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ensureProxy } from "./http.mjs";
import { buildPack, packMarkdown } from "./pack.mjs";
import { checkScript, oldNewsTurns } from "./checks.mjs";

const H = new URL("../", import.meta.url).pathname;
const json = p => JSON.parse(readFileSync(`${H}${p}`, "utf8"));
const GEM = "https://generativelanguage.googleapis.com/v1beta/models";

// What the writer is given from the pack: the running order with each item's facts, mood and words, without the
// links and bookkeeping it does not need
export function forWriter(P) {
  const it = id => P.items.find(i => i.id === id);
  const item = i => ({ subject: i.subject, what: i.line, when: i.when_local, competition: i.competition, mood: i.mood, strength: i.intensity, shape: i.arc?.text, form_before: i.form_before, same_day: i.double,
    goals: i.goals, red_cards: i.reds?.length ? i.reds : undefined, scorecard: i.scorecard, series: i.series, top_three: i.top3, standings: i.standings, scorer_note: i.player_note,
    table: i.table ? { said_after_the_result: true, rows: i.table.rows } : undefined, match_report: i.report?.text, also_reported: i.reports?.slice(0, 4).map(r => r.headline) });
  const story = n => ({ subject: n.subject, headline: n.headline, outlets: n.outlets?.length, text: n.text?.text, mood: n.mood });
  return {
    listener: P.listener, length: { planned_words: P.words, never_more_than: P.max_words },
    running_order: P.running_order.map(s => ({ segment: s.id, name: s.name, about: s.about, words: s.words,
      results: (s.items || []).map(it).map(item), stories: (s.news || []).map(story),
      elsewhere: (s.elsewhere || []).map(c => ({ what: c.line, competition: c.competition, why_it_matters: c.why, report: c.report?.text })),
      where_things_stand: s.standing?.length ? s.standing.map(x => ({ subject: x.subject, facts: x.lines })) : undefined,
      fixtures: (s.fixtures || []).map(f => ({ when: f.say || f.when_local, what: f.what, competition: f.competition, where: f.venue || undefined })) })),
  };
}

// the hosts' English, from their accents in config/show.json (both Indian: "Indian English")
const ACCENT = { indian: "Indian", british: "British", american: "American", australian: "Australian", irish: "Irish", scottish: "Scottish", "south african": "South African" };
const accent = show => { const a = [...new Set((show.hosts || []).map(h => h.accent).filter(Boolean))]; return a.length === 1 && ACCENT[a[0]] ? `${ACCENT[a[0]]} English` : "English, each host in their own accent"; };

export function prompt(P, show) {
  const [A, B] = show.hosts;
  return `You write the script of ${show.title ? `"${show.title}", ` : ""}a daily sports podcast made for one listener, from the facts below. Two hosts talk it through like friends who follow sport closely. It is radio, made to be heard: short spoken sentences, real reactions, never a bulletin read aloud.

THE HOSTS
- ${A.id}: ${A.about}
- ${B.id}: ${B.about}
${show.dynamic ? `Their dynamic: ${show.dynamic}` : ""}${P.previously?.length ? `
What ${A.id} said in the last episode (${B.id} may quote one of these back to him, word for word, when today's facts prove him right or wrong; never invent anything he said):
${P.previously.map(x => `- "${x}"`).join("\n")}` : ""}
${P.old_news?.length ? `ALREADY OLD (told in the last episodes, or results from before today's window): never tell any of these again as news, and never as if it just happened. At most a few words of background when one of today's stories needs it ("after his Shanghai exit, Alcaraz...").
${P.old_news.map(x => `- ${x}`).join("\n")}

` : ""}They speak natural ${accent(show)} (the listener is in ${P.listener?.city || (P.listener?.tz === "Asia/Kolkata" ? "Bengaluru, India" : "their own city")}). Never address the listener by name.

THE SHOW, in exactly this order (segments from RUNNING ORDER; a segment not listed is left out entirely, with no line about it)
- cold-open: one or two lines on the biggest moment, said in its mood. No greeting before it. Then a one-line hello${P.made_at ? ` (it goes out in the ${(h => (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"))(Number(new Date(P.made_at).toLocaleString("en-GB", { timeZone: P.tz || "UTC", hour: "2-digit", hour12: false })))}, so never another part of the day)` : ""}.
- die-hard: each result in order. Follow its "mood", "strength" (1 to 5) and "shape": if the shape says they were 1-3 down, the turn starts in dread and ends in joy. Tell how it happened from the goals or the scorecard, what it means ("form_before", "series", "standings"), what is next. A "table" is said only after that result. Then the stories, each retold from its "text".
- rival-watch: the rival's slip, with more colour and enjoyment ("${P.cast?.rival || "Barcelona"} were dreadful" is fine). Results and big bad news only. Never an injury or anything personal.
- follow: brisk, a result and one line of why it matters.
- around: quick hits from "elsewhere", told with what made it notable.
- ahead: ${P.standing?.length ? 'first "where_things_stand" for each team or player, one short spoken line each (where a series or championship stands, the next match, the next series or tournament), then ' : ""}the fixtures, what is at stake. Say every day and time exactly as its "when" gives it ("late Sunday night, 12:30 am", "tonight, 7 pm"): code has already worked out the right day and am or pm, so never change, convert or add to them.${P.standing?.length ? " Never say who plays a tournament unless it is given." : ""}
- signoff: a short goodbye whose last line is exactly: "${show.signoff}"

FEELING
- ${A.id} feels it out loud, in their own reactions ("Three goals in seven minutes. I had given up."). The facts themselves stay plain. ${B.id} is one notch calmer.
- Strong words are welcome when earned (stunning, incredible, historic, masterclass), but the same big word at most once in the episode, and not every sentence big.
- Never laugh or joke in a gutted, angry or heartbroken moment.

FACTS (strict)
- Use only facts given below. Never add a fact, name, number, quote or descriptive detail (no "packed stadium", no "that evening"). A question is answered only with what is given.
- Say each fact once. Round honestly. Two stories can be the same news from different outlets (the same event, told in other words): tell it once.
- The rival is named ONLY in rival-watch, in the cold-open when a result has "same_day", in a table line after a league result, in a coming fixture against them, or when one of the listener's own stories is about them (a ban that rules a player out of the Clasico, the title race); then say it plainly, as part of that story. Never celebrate or dwell on a rival's win.
- Never talk about how the show is made, sources, feeds, the facts given, or anything missing.

SOUND
- Words people say out loud. Never: pivotal, underscores, testament, landscape, delve, navigate, robust, seamless, notably, showcases.
- Never "Turning to", "In other news", "Moving on", "Let's look at", "Meanwhile", "Stay tuned". Change the subject the way friends do ("Right, ${P.cast?.example || "India"}. Not a good night.").
- Mix longer turns with many quick reactions of two to eight words. At least five real questions between the hosts.
- Never copy a sentence from a report; retell it.
- A short wrap at the end of a segment is fine.

LENGTH: about ${P.words} words, NEVER more than ${P.max_words}. Each segment's "words" is its share.

Return JSON only: {"turns":[{"speaker":"${A.id}"|"${B.id}","segment":"<segment id>","mood":"<the mood of this line>","text":"..."}]}

RUNNING ORDER AND FACTS
${JSON.stringify(forWriter(P), null, 1)}`;
}

async function gemini(model, key, text) {
  const r = await fetch(`${GEM}/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.9 } }), signal: AbortSignal.timeout(540000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`${model} ${r.status}: ${(j.error?.message || "").slice(0, 300)}`), { http: r.status });
  const body = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").replace(/^```(?:json)?|```$/g, "").trim();
  return JSON.parse(body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1)).turns;
}

export async function writeScript(P, { show = json("config/show.json"), profile = json("profile.json"), key, cap = show.rehearsal_requests ?? 3, log = console.log, onTry = () => {} } = {}) {
  const base = prompt(P, show), opts = { hosts: show.hosts.map(h => h.id), rivals: profile.rivals || [], listener: profile.listener?.name };
  const tries = [];
  let asks = 0, model = null, last = null;
  const models = [...show.text_models];
  while (asks < cap) {
    const text = last ? `${base}\n\nYOUR LAST SCRIPT HAD THESE PROBLEMS. Rewrite the whole script and fix every one:\n${last.problems.map(p => `- ${p.msg}`).join("\n")}\n\nYOUR LAST SCRIPT:\n${JSON.stringify({ turns: last.turns })}` : base;
    const m = model || models[0];
    asks++;
    try {
      const turns = await gemini(m, key, text);
      model = m;
      const problems = checkScript(turns, { ...P, known: JSON.stringify([forWriter(P), show.title, show.signoff, P.previously]) }, opts);
      log(`writer ${m}, request ${asks}: ${turns.length} turns, ${problems.length ? problems.map(p => (p.hard ? "HARD " : "") + p.msg).join("; ") : "no problems"}`);
      last = { turns, problems, model: m, request: asks };
      tries.push(last);
      // saved after every try, so a run stopped by its time limit still leaves the best script so far
      onTry({ best: bestOf(tries), tries, requests: asks });
      if (!problems.length) break;
    } catch (e) {
      log(`writer ${m}: ${e.message}`);
      // busy (503, a 429 that is not the day's limit): a minute's wait; then the next model if the first never answered
      if (e.http === 503 || (e.http === 429 && !/per ?day|limit: 0/i.test(e.message))) await new Promise(r => setTimeout(r, 60000));
      if (!model) { models.shift(); if (!models.length) break; } else if (models.length > 1) { model = models.find(x => x !== m) || model; }
    }
  }
  // Old news never reaches the voice, whatever the writer did (Parth, 18 Oct: no dependence on the writer): code takes out
  // any line that still tells an old result
  const best = bestOf(tries);
  if (best) { const drop = new Set(oldNewsTurns(best.turns, P).map(x => x.i)); if (drop.size) { log(`writer: ${drop.size} line(s) telling old news taken out by code`); best.turns = best.turns.filter((_, i) => !drop.has(i)); best.removed = drop.size; } }
  return { best, tries, requests: asks };
}
const bestOf = tries => tries.filter(t => !t.problems.some(p => p.hard)).sort((a, b) => a.problems.length - b.problems.length)[0] || null;

export function scriptMarkdown(r, P) {
  const L = [`# Script rehearsal, ${new Date(P.made_at).toLocaleString("en-GB", { timeZone: P.tz, dateStyle: "full", timeStyle: "short" })}`, ""];
  if (!r.best) { L.push("No script passed the hard checks.", ""); }
  const t = r.best || r.tries.at(-1);
  if (t) {
    const n = t.turns.map(x => x.text).join(" ").split(/\s+/).length;
    L.push(`Written by ${t.model} (request ${t.request} of ${r.requests}). ${n} words, about ${Math.round(n / 164 * 10) / 10} minutes. ${t.problems.length ? `Problems left: ${t.problems.map(p => (p.hard ? "HARD " : "") + p.msg).join("; ")}` : "No problems left."}`, "");
    let seg = null;
    for (const x of t.turns) {
      if (x.segment !== seg) { seg = x.segment; L.push(`## ${P.running_order.find(s => s.id === seg)?.name || seg}`, ""); }
      L.push(`**${x.speaker}** _(${x.mood})_: ${x.text}`, "");
    }
  }
  L.push("## Every try", ...r.tries.map(x => `- Request ${x.request}, ${x.model}: ${x.problems.length ? x.problems.map(p => (p.hard ? "HARD " : "") + p.msg).join("; ") : "no problems"}`));
  return L.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureProxy();
  const args = process.argv.slice(2), arg = k => args.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
  if (!args.includes("--rehearse")) { console.error("writer: only rehearsals for now (--rehearse); the live run comes later"); process.exit(1); }
  const key = process.env.GEMINI_KEY_REHEARSAL;
  if (!key) { console.error("writer: GEMINI_KEY_REHEARSAL is needed"); process.exit(1); }
  if (args.includes("--models")) {
    const j = await fetch(`${GEM}?pageSize=200`, { headers: { "x-goog-api-key": key } }).then(r => r.json());
    console.log((j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", "")).join("\n"));
    process.exit(0);
  }
  const days = Number(arg("days")) || null;
  const P = await buildPack({ hours: days ? days * 24 : undefined });
  const day = new Date().toLocaleDateString("en-CA", { timeZone: P.tz }), out = `${H}rehearsals/${day}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/pack.json`, JSON.stringify(P, null, 2));
  writeFileSync(`${out}/pack.md`, packMarkdown(P));
  const save = r => { writeFileSync(`${out}/script.json`, JSON.stringify(r, null, 2)); writeFileSync(`${out}/script.md`, scriptMarkdown(r, P)); };
  const r = await writeScript(P, { key, onTry: save });
  writeFileSync(`${out}/script.json`, JSON.stringify(r, null, 2));
  writeFileSync(`${out}/script.md`, scriptMarkdown(r, P));
  console.log(`writer: ${r.best ? "script kept" : "no script passed"} after ${r.requests} request(s) -> rehearsals/${day}/script.md`);
}
