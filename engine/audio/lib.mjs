// The episode's sound helpers, copied from The House of 1400 (scripts/podcast/lib.mjs), where they have voiced the 14:00
// show since 12 Oct 2026: numbers and symbols said as words, a host's single-voice take cut back into lines (by its
// pauses, or at the listening model's word times), and the WebVTT transcript.

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100, out = [];
  if (h) out.push(`${ONES[h]} hundred`);
  if (r) out.push((h ? "and " : "") + (r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : "")));
  return out.join(" ");
}
// Indian style: crore and lakh
export function intWords(n) {
  n = Math.round(Math.abs(n));
  if (n === 0) return "zero";
  const parts = [], crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), thou = Math.floor((n % 1e5) / 1000), rest = n % 1000;
  if (crore) parts.push(`${crore >= 1000 ? intWords(crore) : under1000(crore)} crore`);
  if (lakh) parts.push(`${under1000(lakh)} lakh`);
  if (thou) parts.push(`${under1000(thou)} thousand`);
  if (rest) parts.push((parts.length && rest < 100 ? "and " : "") + under1000(rest));
  return parts.join(" ");
}
export function numWords(s) {
  const t = String(s).replace(/,/g, "");
  const [i, d] = t.split(".");
  return d ? `${intWords(Number(i))} point ${[...d].map(x => ONES[Number(x)]).join(" ")}` : intWords(Number(i));
}

// Everything as it is said: "₹32,490 crore" -> "thirty-two thousand four hundred and ninety crore rupees", "2–1" ->
// "two-one", "0.76%" -> "zero point seven six per cent", then the pronunciation list (config podcast.pronounce).
export function spoken(text, pronounce = {}) {
  let s = String(text || "");
  for (const [w, say] of Object.entries(pronounce)) s = s.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), say);
  // a cricket score: "247/3" is "two hundred and forty-seven for three"
  s = s.replace(/\b(\d{1,3})\/(\d{1,2})\b/g, (_, r, w) => `${r} for ${w}`);
  s = s.replace(/<[^>]*>/g, m => (/^<(short pause|long pause|pause|laugh|sigh|breath|chuckle)>$/i.test(m) ? m : ""));
  s = s.replace(/\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s?(trillion|billion|million|bn|m))?\b/gi, (_, n, u) => `${numWords(n)}${u ? " " + ({ bn: "billion", m: "million" }[u.toLowerCase()] || u.toLowerCase()) : ""} dollars`);
  s = s.replace(/(?:₹|Rs\.?\s?|INR\s?)(\d[\d,]*(?:\.\d+)?)(?:\s?(lakh crore|crore|lakh|thousand))?/gi, (_, n, u) => `${numWords(n)}${u ? " " + u.toLowerCase() : ""} rupees`);
  s = s.replace(/(\d+)\s?[–-]\s?(\d+)(?=\s|[,.;!?]|$)/g, (_, a, b) => `${numWords(a)}-${numWords(b)}`);
  s = s.replace(/(\d[\d,]*(?:\.\d+)?)\s?%/g, (_, n) => `${numWords(n)} per cent`);
  s = s.replace(/(\d+)(st|nd|rd|th)\b/g, (_, n) => ordinal(Number(n)));
  // a clock time. The script may write it the 12-hour way ("7:00 PM", "12:30 am") or the 24-hour way ("19:00"). A time
  // with its own am or pm keeps it (17 Oct: "7:00 PM" was read "seven a m, P M", and "11:00 PM" as "eleven a m",
  // because this assumed 24-hour times, as the paper it was copied from writes them); a 24-hour time gets one; a bare
  // 1 to 12 o'clock with no am or pm stays bare.
  s = s.replace(/\b(\d{1,2})(?::(\d{2})|\.(\d{2})(?=\s*[ap](?:\.\s?m\.|\s?m\b)))(?:\s*([ap])(?:\.\s?m\.|\s?m\b))?/gi, (all, h, m1, m2, ap) => {
    const m = m1 ?? m2, H = Number(h), M = Number(m);
    if (H > 23 || M > 59) return all;
    const clock = `${intWords(H % 12 || 12)}${M === 0 ? "" : " " + (M < 10 ? "oh " + ONES[M] : intWords(M))}`;
    if (ap) return `${clock} ${ap.toLowerCase()} m`;
    if (H === 0 || H > 12 || h.length === 2 && h[0] === "0") return `${clock} ${H < 12 ? "a m" : "p m"}`;
    return clock;
  });
  // "7 PM", "11am": the hour alone, with its am or pm
  s = s.replace(/\b(\d{1,2})\s*([ap])(?:\.\s?m\.|\s?m\b)/gi, (all, h, ap) => (Number(h) >= 1 && Number(h) <= 12 ? `${intWords(Number(h))} ${ap.toLowerCase()} m` : all));
  s = s.replace(/\d[\d,]*(?:\.\d+)?/g, n => numWords(n));
  // a colon or semicolon inside a line is said as a short comma pause: the voice holds a colon like the end of a line,
  // and the cut by pauses then split one line in two there (17 Oct: "one huge relief: Jude Bellingham...")
  s = s.replace(/\s*[:;]\s+/g, ", ");
  s = s.replace(/&/g, " and ").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
  return s;
}
export function ordinal(n) {
  const w = intWords(n), irregular = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
  const m = w.match(/(\w+)$/), last = m[1];
  if (irregular[last]) return w.slice(0, -last.length) + irregular[last];
  if (/y$/.test(last)) return w.slice(0, -1) + "ieth";
  return w + "th";
}

const clock12 = (h, m) => `${intWords(h % 12 || 12)}${m ? " " + (m < 10 ? "oh " + ONES[m] : intWords(m)) : ""} ${h < 12 ? "a m" : "p m"}`;

// The episode's own transcript (Parth, 14 Oct): every line as the script has it, with its speaker and its time in the
// episode, as WebVTT, the form Apple Podcasts reads from the feed (podcast:transcript). cues[i] = [start, end] seconds.
export function vttOf(turns, cues) {
  const ts = s => { const ms = Math.max(0, Math.round(s * 1000)), h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60, x = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`; };
  const clean = t => String(t || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/-->/g, "->");
  const cuesOut = turns.map((t, i) => (cues?.[i] && clean(t.text) ? `${i + 1}\n${ts(cues[i][0])} --> ${ts(Math.max(cues[i][1], cues[i][0] + 0.5))}\n<v ${t.speaker}>${clean(t.text)}` : null)).filter(Boolean);
  return cuesOut.length ? `WEBVTT\n\n${cuesOut.join("\n\n")}\n` : null;
}


// Cuts one host's single-voice take (24 kHz, 16-bit mono PCM: every line of theirs read in order, with a pause asked
// for between lines) back into its lines. Each cut is a silence inside the take, chosen together so that they fall in
// order, near where the line lengths say each line should end, and on the longer pauses (13 Oct: Tarun's first solo
// take had pauses between lines no longer than the breaths inside them, and "the n-1 longest silences" failed).
// Returns null when the take does not split cleanly (too few pauses, or a piece far off its line's length), and the
// caller falls back.
export function splitLines(pcm, words) {
  const n = words.length, F = 480, frames = Math.floor(pcm.length / 2 / F), rms = new Float64Array(frames);
  for (let f = 0; f < frames; f++) { let s = 0; for (let i = 0; i < F; i++) { const v = pcm.readInt16LE((f * F + i) * 2); s += v * v; } rms[f] = Math.sqrt(s / F); }
  const loud = [...rms].sort((a, b) => a - b)[Math.floor(frames * 0.95)] || 0, thr = Math.max(150, loud * 0.06);
  const quiet = f => rms[f] < thr;
  let a = 0, b = frames - 1; while (a < frames && quiet(a)) a++; while (b > a && quiet(b)) b--;
  if (a > b) return null;
  if (n === 1) return [pcm.subarray(a * F * 2, (b + 1) * F * 2)];
  // silences of 0.1 s or more inside the take are the possible cuts
  const runs = [];
  for (let f = a; f <= b; f++) if (quiet(f)) { const s = f; while (f <= b && quiet(f)) f++; if (f - s >= 5) runs.push({ s, e: f, len: f - s, mid: (s + f) / 2 }); }
  if (runs.length < n - 1) return null;
  // where each line should end, from the words (plus one for each line's own start and finish)
  const span = b - a, wt = words.map(w => w + 1), all = wt.reduce((x, y) => x + y, 0);
  const want = []; for (let k = 0, c = 0; k < n - 1; k++) { c += wt[k]; want.push(a + span * c / all); }
  const longest = Math.max(...runs.map(r => r.len));
  const cost = (k, j) => 4 * Math.abs(runs[j].mid - want[k]) / span - runs[j].len / longest;
  // the cheapest set of n-1 cuts in order (dynamic programming over boundaries and candidate silences)
  const m = runs.length, best = [], from = [];
  for (let k = 0; k < n - 1; k++) {
    best.push(new Float64Array(m).fill(Infinity)); from.push(new Int32Array(m).fill(-1));
    let run = Infinity, at = -1;
    for (let j = k; j < m - (n - 2 - k); j++) {
      if (k) { const p = best[k - 1][j - 1]; if (p < run) { run = p; at = j - 1; } if (at < 0) continue; }
      best[k][j] = (k ? run : 0) + cost(k, j); from[k][j] = at;
    }
  }
  let j = -1, low = Infinity; best[n - 2].forEach((v, i) => { if (v < low) { low = v; j = i; } });
  if (j < 0) return null;
  const cuts = []; for (let k = n - 2; k >= 0; k--) { cuts.unshift(runs[j]); j = from[k][j]; }
  const pieces = [];
  for (let i = 0, start = a; i < n; i++) {
    let s = start, e = i < n - 1 ? cuts[i].s : b + 1;
    while (s < e && quiet(s)) s++; while (e > s && quiet(e - 1)) e--;
    pieces.push([Math.max(0, s - 3), Math.min(frames, e + 3)]);
    if (i < n - 1) start = cuts[i].e;
  }
  // seconds per word, line by line, against the take's own pace
  const pace = pieces.map(([s, e], i) => ((e - s) * F / 24000) / Math.max(1, words[i]));
  const mid = pace.slice().sort((x, y) => x - y)[Math.floor(n / 2)];
  if (pieces.some(([s, e], i) => e - s < 8 || (words[i] >= 4 && (pace[i] > mid * 2.6 || pace[i] < mid / 2.6)))) return null;
  return pieces.map(([s, e]) => pcm.subarray(s * F * 2, e * F * 2));
}

// Cuts a host's take at given times (seconds, from the listening model's word times: verify_lines.py align): each cut
// moves to the quietest 20 ms within a quarter second either side, and each piece is trimmed of its silent ends.
export function cutAt(pcm, secs, { start = 0, end = null } = {}) {
  const F = 480, frames = Math.floor(pcm.length / 2 / F), rms = new Float64Array(frames);
  for (let f = 0; f < frames; f++) { let s = 0; for (let i = 0; i < F; i++) { const v = pcm.readInt16LE((f * F + i) * 2); s += v * v; } rms[f] = Math.sqrt(s / F); }
  const loud = [...rms].sort((a, b) => a - b)[Math.floor(frames * 0.95)] || 0, thr = Math.max(150, loud * 0.06), quiet = f => rms[f] < thr;
  const at = secs.map(x => { const c = Math.round(x * 50); let best = c; for (let f = Math.max(1, c - 12); f <= Math.min(frames - 2, c + 12); f++) if (rms[f] < rms[best] || best >= frames) best = f; return Math.max(1, Math.min(frames - 1, best)); });
  if (at.some((x, i) => i && x <= at[i - 1])) return null;
  const b0 = Math.max(0, Math.min(at[0] ?? frames, Math.floor(start * 50))), b1 = end == null ? frames : Math.min(frames, Math.max(at.at(-1) ?? 0, Math.ceil(end * 50)));
  const bounds = [b0, ...at, b1];
  const pieces = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    let s = bounds[i], e = bounds[i + 1];
    while (s < e && quiet(s)) s++; while (e > s && quiet(e - 1)) e--;
    if (e - s < 8) return null;
    pieces.push(pcm.subarray(Math.max(0, s - 3) * F * 2, Math.min(frames, e + 3) * F * 2));
  }
  return pieces;
}
