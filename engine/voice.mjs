// The voices: the 14:00 show's method (scripts/podcast/make.mjs in house-of-1400). Each host alone, all their lines in
// ONE single-voice take with the same description on every line, then cut back into lines at the pauses, and every
// cut piece heard by the listening check (engine/audio/verify_lines.py) before it is used; a cut is never used unheard.
// If a take will not cut cleanly, the whole conversation in one two-voice take. No backup voice (Parth, 16 Oct): when
// Gemini cannot voice it, there is no episode that day and the run fails loudly.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { spoken, splitLines, cutAt } from "./audio/lib.mjs";

const H = new URL("../", import.meta.url).pathname;
const GEM = "https://generativelanguage.googleapis.com/v1beta/models";
export const wavHeader = (n, rate = 24000) => { const b = Buffer.alloc(44); b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40); return b; };
const pcmOf = buf => { if (buf.slice(0, 4).toString() !== "RIFF") return buf; let o = 12; while (o < buf.length - 8) { const id = buf.slice(o, o + 4).toString(), size = buf.readUInt32LE(o + 4); if (id === "data") return buf.slice(o + 8, o + 8 + size); o += 8 + size; } return buf.slice(44); };

// The hosts as the voices know them (config/show.json hosts + config/voices.json): the voice, and one description,
// word for word on every line, so the voice and accent stay put for the whole take (the 14:00 show, 13 Oct)
export function hostsOf(show, voices) {
  const accent = k => voices.accents?.[k] || "";
  return show.hosts.map(h => ({ id: h.id, name: h.name || h.id, voice: h.voice, describe: `${h.voice_style || ""} He ${accent(h.accent)}`.trim() }));
}
const moodLine = (show, m) => (show.moods?.[m] ? ` Tone of this line: ${show.moods[m]}.` : "");

export async function voiceScript(turns, { key, show, voices, out, log = console.log, cap = 6 }) {
  const hosts = hostsOf(show, voices), byId = Object.fromEntries(hosts.map(h => [h.id, h]));
  const speakers = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: hosts.map(h => ({ speaker: h.id, voiceConfig: { prebuiltVoiceConfig: { voiceName: h.voice } } })) } };
  const models = show.tts_models || ["gemini-3.8-flash-tts"];
  const texts = turns.map(t => spoken(t.text, show.pronounce || {}));
  let asks = 0;
  const ask = async (model, body) => {
    if (asks >= cap) throw new Error(`the run's ${cap} voice requests are used`);
    asks++;
    const r = await fetch(`${GEM}/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    const j = await r.json().catch(() => ({}));
    const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!r.ok || !part) throw new Error(`${model} ${r.status}: ${(j.error?.message || j.candidates?.[0]?.finishReason || "no audio").slice(0, 200)}`);
    return pcmOf(Buffer.from(part.inlineData.data, "base64"));
  };
  const dir = `${out}/verify`; mkdirSync(dir, { recursive: true });
  const py = (job, res) => execFileSync(process.env.PODCAST_PYTHON || "python3", [`${H}engine/audio/verify_lines.py`, job, res], { stdio: ["ignore", "inherit", "inherit"], timeout: 8 * 60000 });
  const listen = (sp, pieces, lines) => {
    const job = `${dir}/${sp}.json`, res = `${dir}/${sp}.out.json`;
    const list = pieces.map((p, i) => { const f = `${dir}/${sp}-${i + 1}.wav`; writeFileSync(f, Buffer.concat([wavHeader(p.length), p])); return { wav: f, text: lines[i] }; });
    writeFileSync(job, JSON.stringify({ model: show.verify_model || "base.en", pieces: list }));
    py(job, res);
    const bad = JSON.parse(readFileSync(res, "utf8")).pieces.map((x, i) => [i, x]).filter(([, x]) => !x.ok);
    if (bad.length) log(`voice: ${sp}'s cut is wrong at line ${bad.map(([i, x]) => `${i + 1} (heard "${x.heard.slice(0, 50)}")`).join(", ")}`);
    return !bad.length;
  };
  const byEar = (sp, take, lines) => {
    const wav = `${dir}/${sp}-take.wav`, job = `${dir}/${sp}-align.json`, res = `${dir}/${sp}-align.out.json`;
    writeFileSync(wav, Buffer.concat([wavHeader(take.length), take]));
    writeFileSync(job, JSON.stringify({ model: show.verify_model || "base.en", take: wav, lines }));
    try { py(job, res); } catch { return null; }
    const r = JSON.parse(readFileSync(res, "utf8"));
    return r.ok ? cutAt(take, r.cuts, { start: r.start, end: r.end }) : null;
  };
  // 1. solo: each host alone, one take each
  for (const model of models) {
    try {
      const pieces = new Map();
      for (const h of hosts) {
        const mine = turns.map((t, i) => [t, i]).filter(([t]) => t.speaker === h.id), lines = mine.map(([, i]) => texts[i]);
        const body = { contents: [{ role: "user", parts: mine.map(([t], k) => ({ text: lines[k], speech_metadata: { speaker: h.id, style: `${h.describe}${moodLine(show, t.mood)} Leave a clear pause after each line.` } })) }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: speakers } };
        const take = await ask(model, body);
        writeFileSync(`${dir}/${h.id}-take.wav`, Buffer.concat([wavHeader(take.length), take]));
        let cut = splitLines(take, lines.map(l => l.split(/\s+/).length));
        if (cut && !listen(h.id, cut, lines)) cut = null;
        if (!cut) { cut = byEar(h.id, take, lines); if (cut && !listen(`${h.id}-ear`, cut, lines)) cut = null; }
        if (!cut) throw new Error(`${h.id}'s take did not cut cleanly into ${lines.length} lines`);
        mine.forEach(([, i], k) => pieces.set(i, cut[k]));
        log(`voice: ${h.id} (${h.voice}), ${lines.length} lines, every one heard as written`);
      }
      return { form: "solo", model, requests: asks, pieces: turns.map((t, i) => ({ speaker: t.speaker, pcm: pieces.get(i) })) };
    } catch (e) { log(`voice: solo on ${model} failed: ${e.message}`); if (/requests are used/.test(e.message)) break; }
  }
  // 2. one two-voice take of the whole conversation (no cuts, so no listening check is needed; one mic)
  for (const model of models) {
    try {
      const body = { contents: [{ role: "user", parts: turns.map((t, i) => ({ text: texts[i], speech_metadata: { speaker: t.speaker, style: byId[t.speaker].describe } })) }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: speakers } };
      const take = await ask(model, body), words = texts.join(" ").split(/\s+/).length;
      if (take.length / 48000 < (words / 230) * 60) throw new Error(`came back cut short (${Math.round(take.length / 48000)} s for ${words} words)`);
      log(`voice: one two-voice take on ${model}`);
      return { form: "one take", model, requests: asks, take };
    } catch (e) { log(`voice: one take on ${model} failed: ${e.message}`); if (/requests are used/.test(e.message)) break; }
  }
  throw new Error(`Gemini could not voice the episode (${asks} voice requests)`);
}
