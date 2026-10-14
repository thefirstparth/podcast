// The voice audition (Parth, 16 Oct: "I know nothing about their tone/accent/age", option A): each candidate voice says
// the same short lines, with no accent asked for, so he hears each voice as it is. Two voices a request (a Fan
// candidate and an Anchor candidate; Gemini voices two speakers in one take), so seven voices cost four requests of the
// rehearsal key's day. Nothing is published: the MP3s go to rehearsals/voices/<date>/ for him to play.
//   GEMINI_KEY_REHEARSAL=... node scripts/audition.mjs
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KEY = process.env.GEMINI_KEY_REHEARSAL;
if (!KEY) { console.error("audition: GEMINI_KEY_REHEARSAL is needed"); process.exit(1); }
const H = new URL("../", import.meta.url).pathname, day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), OUT = `${H}rehearsals/voices/${day}`;
mkdirSync(OUT, { recursive: true });
const GEM = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"]; // the 14:00 show's, in order
const CAP = 6; // requests in all, retries included: the rest of the day's ten stay free

const FAN = [
  { text: "Three goals in seven minutes. Seven! I had completely given up on that one.", style: "an excited sports fan, thrilled" },
  { text: "India lost by twenty-four runs. Honestly, that one hurts.", style: "a sports fan, gutted and quiet" },
];
const ANCHOR = [
  { text: "West Indies made two hundred and forty-seven for three, and the series is level at two-all.", style: "a calm, experienced sports broadcaster" },
  { text: "So it all comes down to Saturday in Bengaluru. Can India bounce back?", style: "a calm, experienced sports broadcaster, curious" },
];
// Fan candidates: Fenrir ("excitable"), Puck ("upbeat"), Sadachbia ("lively"); Anchor candidates: Algenib ("gravelly"),
// Charon ("informative"), Sadaltager ("knowledgeable"), Orus ("firm"). Google's own descriptions.
const PAIRS = [["Fenrir", "Algenib"], ["Puck", "Charon"], ["Sadachbia", "Sadaltager"], ["Fenrir", "Orus"]];

let asks = 0;
async function voice(fan, anchor) {
  const parts = [...FAN.map(l => ({ text: l.text, speech_metadata: { speaker: "Fan", style: l.style } })), ...ANCHOR.map(l => ({ text: l.text, speech_metadata: { speaker: "Anchor", style: l.style } }))];
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
for (const [i, [fan, anchor]] of PAIRS.entries()) {
  try {
    const { pcm, model, mime } = await voice(fan, anchor), raw = `${OUT}/take.pcm`, name = `${i + 1}-fan-${fan}-anchor-${anchor}.mp3`;
    writeFileSync(raw, pcm);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(rate(mime)), "-ac", "1", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "96k", `${OUT}/${name}`]);
    rmSync(raw);
    made.push({ i: i + 1, fan, anchor, name, model, secs: Math.round(pcm.length / 2 / rate(mime)) });
  } catch (e) { console.log(`audition: pair ${i + 1} not made: ${e.message}`); if (asks >= CAP) break; }
}
const L = [`# Voice audition, ${day}`, "", "No accent was asked for, so each voice is heard as it is. The Fan says two lines (excited, then gutted), then the Anchor says two (calm, then a question). Fenrir is heard twice, with two different Anchors.", "",
  "| Clip | Fan voice | Anchor voice | Length | Listen |", "|---|---|---|---|---|", ...made.map(m => `| ${m.i} | ${m.fan} | ${m.anchor} | ${m.secs} s | [${m.name}](${encodeURIComponent(m.name)}) |`), "",
  `Made with ${made[0]?.model || "no model"}, ${asks} voice request(s) of the rehearsal key.`, "", "Google's own descriptions: Fenrir excitable, Puck upbeat, Sadachbia lively; Algenib gravelly, Charon informative, Sadaltager knowledgeable, Orus firm."];
writeFileSync(`${OUT}/README.md`, L.join("\n"));
console.log(`audition: ${made.length} clip(s), ${asks} request(s) -> rehearsals/voices/${day}/`);
if (!made.length) process.exit(1);
