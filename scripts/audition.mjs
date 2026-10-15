// The voice audition (Parth, 16 Oct: "I know nothing about their tone/accent/age", option A): each candidate voice says
// the same short lines, with no accent asked for, so he hears each voice as it is. Two voices a request (a Fan
// candidate and an Anchor candidate; Gemini voices two speakers in one take), so seven voices cost four requests of the
// rehearsal key's day. Nothing is published: the MP3s go to rehearsals/voices/<date>/ for him to play.
//   GEMINI_KEY_REHEARSAL=... node scripts/audition.mjs
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KEY = process.env.GEMINI_KEY_REHEARSAL;
if (!KEY) { console.error("audition: GEMINI_KEY_REHEARSAL is needed"); process.exit(1); }
// the round to make: config/voices.json, the first one not made yet (or --round=<id>)
const H = new URL("../", import.meta.url).pathname, day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const V = JSON.parse(readFileSync(`${H}config/voices.json`, "utf8")), want = process.argv.find(a => a.startsWith("--round="))?.split("=")[1];
const ROUND = want ? V.rounds.find(r => r.id === want) : V.rounds.find(r => !r.made);
if (!ROUND) { console.error("audition: no round to make (config/voices.json)"); process.exit(1); }
const OUT = `${H}rehearsals/voices/${ROUND.id}`;
mkdirSync(OUT, { recursive: true });
const GEM = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"]; // the 14:00 show's, in order
const CAP = 8; // requests in all, retries included: the rest of the day's ten stay free

const FAN = [
  { text: "Three goals in seven minutes. Seven! I had completely given up on that one.", style: ROUND.fan_style?.excited || "an excited sports fan" },
  { text: "India lost by twenty-four runs. Honestly, that one hurts.", style: ROUND.fan_style?.gutted || "a sports fan, gutted and quiet" },
];
const ANCHOR = [
  { text: "West Indies made two hundred and forty-seven for three, and the series is level at two-all.", style: ROUND.anchor_style || "a calm, experienced sports broadcaster" },
  { text: "So it all comes down to Saturday in Bengaluru. Can India bounce back?", style: `${ROUND.anchor_style || "a calm, experienced sports broadcaster"}, curious` },
];
// a pair may ask for an accent per host (config/voices.json accents): "the speaker <accent text>"
const accent = k => (k && V.accents?.[k] ? ` He ${V.accents[k]}` : "");
const PAIRS = ROUND.pairs;

let asks = 0;
async function voice(fan, anchor, opt = {}) {
  const parts = [...FAN.map(l => ({ text: l.text, speech_metadata: { speaker: "Fan", style: `${l.style}.${accent(opt.fan)}` } })), ...ANCHOR.map(l => ({ text: l.text, speech_metadata: { speaker: "Anchor", style: `${l.style}.${accent(opt.anchor)}` } }))];
  const body = { contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
    { speaker: "Fan", voiceConfig: { prebuiltVoiceConfig: { voiceName: fan } } }, { speaker: "Anchor", voiceConfig: { prebuiltVoiceConfig: { voiceName: anchor } } }] } } } };
  for (const model of MODELS) {
    if (asks >= CAP) throw new Error(`the audition's ${CAP} requests are used`);
    asks++;
    const r = await fetch(`${GEM}/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(240000) });
    const j = await r.json().catch(() => ({}));
    const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (r.ok && part) { console.log(`audition: ${fan} and ${anchor} on ${model}`); return { pcm: Buffer.from(part.inlineData.data, "base64"), model, mime: part.inlineData.mimeType }; }
    console.log(`audition: ${fan} and ${anchor} on ${model}: ${r.status} ${(j.error?.message || j.candidates?.[0]?.finishReason || "no audio").slice(0, 200)}`);
  }
  throw new Error(`no voice model answered for ${fan} and ${anchor}`);
}

const rate = mime => Number(String(mime || "").match(/rate=(\d+)/)?.[1]) || 24000;
const made = [];
for (const [i, [fan, anchor, opt = {}]] of PAIRS.entries()) {
  try {
    const { pcm, model, mime } = await voice(fan, anchor, opt), raw = `${OUT}/take.pcm`, name = `${i + 1}-fan-${fan}-anchor-${anchor}${opt.label ? `-${opt.label.toLowerCase().replace(/\W+/g, "-")}` : ""}.mp3`;
    writeFileSync(raw, pcm);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(rate(mime)), "-ac", "1", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "96k", `${OUT}/${name}`]);
    rmSync(raw);
    made.push({ i: i + 1, fan: `${fan}${opt.fan ? ` (${opt.fan})` : ""}`, anchor: `${anchor}${opt.anchor ? ` (${opt.anchor})` : ""}`, name, model, secs: Math.round(pcm.length / 2 / rate(mime)) });
  } catch (e) { console.log(`audition: pair ${i + 1} not made: ${e.message}`); if (asks >= CAP) break; }
}
const L = [`# Voice audition, ${ROUND.id} (${day})`, "", `${PAIRS.some(p => p[2]) ? "Accents as labelled." : "No accent was asked for, so each voice is heard as it is."} The Fan says two lines (${FAN.map(l => l.style).join("; then ")}), then the Anchor says two (calm, then a question).`, ROUND.note || "", "",
  "| Clip | Fan voice | Anchor voice | Length | Listen |", "|---|---|---|---|---|", ...made.map(m => `| ${m.i} | ${m.fan} | ${m.anchor} | ${m.secs} s | [${m.name}](${encodeURIComponent(m.name)}) |`), "",
  `Made with ${made[0]?.model || "no model"}, ${asks} voice request(s) of the rehearsal key.`, "", "Google's own one-word descriptions: Fenrir excitable, Puck upbeat, Sadachbia lively, Umbriel easy-going, Zubenelgenubi casual, Algieba smooth; Algenib gravelly, Charon informative, Sadaltager knowledgeable, Orus firm."];
writeFileSync(`${OUT}/README.md`, L.join("\n"));
if (made.length) { ROUND.made = day; writeFileSync(`${H}config/voices.json`, JSON.stringify(V, null, 2) + "\n"); }
console.log(`audition: ${made.length} clip(s), ${asks} request(s) -> rehearsals/voices/${day}/`);
if (!made.length) process.exit(1);
