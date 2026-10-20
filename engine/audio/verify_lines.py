# The listening check for the solo voice form (scripts/podcast/make.mjs; Parth, 13 Oct: "how are we sure this will
# happen accurately?"). After a host's single-voice take is cut into lines by silence alone (lib.mjs splitLines), an
# open-source speech-to-text model (faster-whisper, on the runner's processor, free) transcribes every piece, and each
# piece must say its own line: a fair share of its words, more of them than of the lines either side, and not far
# more words than the line has (a cut in the wrong place moves words into a neighbour or runs two lines together). A one or two word line ("Arre wah!") only has to stay short, since a cut
# that swallowed a neighbour makes it long. Any piece that fails rejects the whole cut, and make.mjs falls back.
# Reads {model, pieces: [{wav, text}]} from argv[1], writes {ok, pieces: [{f1, ok, heard}]} to argv[2].
import json, re, sys, unicodedata, wave
from difflib import SequenceMatcher
import numpy as np

NUMBERS = set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
              "seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand lakh "
              "lakhs crore crores million billion trillion point per cent percent and".split())

def words(text, spoken):
    # numbers are left out on both sides: the script spells them ("seventy-two thousand"), the model writes digits
    ws = re.sub(r"<[^>]+>", " ", text.lower()).replace("-", " ")
    ws = re.findall(r"[a-z0-9']+", ws)
    return [w for w in ws if not re.search(r"\d", w) and not (spoken and w in NUMBERS)]

def audio(path):
    # the WAV read here, 16-bit mono, resampled to the model's 16 kHz: no audio decoder library to break on the day
    with wave.open(path) as w:
        rate, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1: x = x.reshape(-1, ch).mean(axis=1)
    if rate != 16000: x = np.interp(np.arange(0, len(x), rate / 16000.0), np.arange(len(x)), x).astype(np.float32)
    return x

def f1(want, got):
    if not want or not got: return 0.0
    m = sum(b.size for b in SequenceMatcher(None, want, got, autojunk=False).get_matching_blocks())
    return 2 * m / (len(want) + len(got))

def edge_leak(got, own, before, after, n=4):
    # the piece's first n heard words found as a run in the last 2n words of the line before, and not at the start of
    # its own line (or the same at the other end with the line after)
    def run_in(seq, hay):
        return len(seq) >= 3 and any(hay[k:k + len(seq)] == seq for k in range(len(hay) - len(seq) + 1))
    head, tail = got[:n], got[-n:]
    if before and run_in(head, before[-2 * n:]) and not run_in(head, own[:2 * n]): return "starts with the line before"
    if after and run_in(tail, after[:2 * n]) and not run_in(tail, own[-2 * n:]): return "ends with the line after"
    return None

def misplaced(want, got, run=4):
    # the whole take at once (19 Oct: a cut one sentence early moved "In the second half, sixty-three minutes in,
    # Mbappe stepped up to convert a penalty" into the next piece, so it played after the other host had answered and
    # after the fourth goal; each piece still had most of its own words, and the moved sentence was too long for the
    # edge check). Every line's words are matched in order against every piece's heard words, and a run of `run` or
    # more of one line's words heard inside another line's piece is a cut in the wrong place.
    script, owner, heard, piece = [], [], [], []
    for k, w in enumerate(want): script += w; owner += [k] * len(w)
    for k, g in enumerate(got): heard += g; piece += [k] * len(g)
    bad = set()
    for b in SequenceMatcher(None, script, heard, autojunk=False).get_matching_blocks():
        i = 0
        while i < b.size:
            j = i
            while j < b.size and owner[b.a + j] == owner[b.a + i] and piece[b.b + j] == piece[b.b + i]: j += 1
            if j - i >= run and owner[b.a + i] != piece[b.b + i]: bad.update({owner[b.a + i], piece[b.b + i]})
            i = j
    return sorted(bad)

def stray_edges(want, got):
    # one word across a cut (20 Oct: the voice slurred "Ukraine", the cut fell after the slur, and "Ukraine" played
    # after the other host's reply): a line's last word heard only at the start of the next piece, or its first word
    # only at the end of the piece before. Too short for the runs above. Pairs (piece, piece) that are wrong.
    # (heard loosely: the listening model wrote "Ukraine" as "Crane")
    like = lambda a, ws: any(SequenceMatcher(None, a, x).ratio() >= 0.6 for x in ws)
    bad = set()
    for k in range(len(want) - 1):
        w, nxt, g, gn = want[k], want[k + 1], got[k], got[k + 1]
        if w and gn and len(w[-1]) >= 4 and not like(w[-1], g[-3:]) and like(w[-1], gn[:2]) and not like(w[-1], nxt[:3]): bad.update({k, k + 1})
        if nxt and g and len(nxt[0]) >= 4 and not like(nxt[0], gn[:3]) and like(nxt[0], g[-2:]) and not like(nxt[0], w[-3:]): bad.update({k, k + 1})
    return sorted(bad)

def proper_names(text):
    # names in the middle of a sentence (a capital not after a full stop), five letters or more, as plain lower case
    t = re.sub(r"<[^>]+>", " ", text)
    out = []
    for m in re.finditer(r"(?<![.!?]\s)(?<!^)\b([A-Z][A-Za-zÀ-ſ'’-]{4,})", t):
        w = unicodedata.normalize("NFD", m.group(1)).encode("ascii", "ignore").decode().lower().strip("'’-")
        if len(w) >= 5: out.append(w)
    return out

def name_swaps(texts, heard, all_names):
    # a name said as another name (20 Oct: "Rafael Jodar, ninth in the race" was heard as "Rafael Nadal": the voice
    # swapped in the famous one). The line and what was heard are lined up word by word; where a name of the line is
    # replaced, the words heard in its place must not be another name from the script. A misheard spelling of the right
    # name ("Diamandi" for Diomande) is not a swap. Returns {piece: "said X for Y"}.
    like = lambda a, b: SequenceMatcher(None, a, b).ratio()
    plain = lambda t: re.findall(r"[a-z']+", unicodedata.normalize("NFD", re.sub(r"<[^>]+>", " ", t)).encode("ascii", "ignore").decode().lower().replace("-", " "))
    out = {}
    for i, (text, h) in enumerate(zip(texts, heard)):
        mine, a, b = set(proper_names(text)), plain(text), plain(h)
        others = [n for n in all_names if n not in mine and not any(like(n, x) >= 0.6 for x in mine)]
        for op, a1, a2, b1, b2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if op != "replace" or b2 - b1 > 3: continue
            gone = [w for w in a[a1:a2] if w in mine and not any(like(w, g) >= 0.6 for g in b[b1:b2])]
            swap = next((o for o in others for g in b[b1:b2] if like(o, g) >= 0.85), None)
            if gone and swap: out[i] = f"said {swap} for {gone[0]}"; break
    return out

def tokens(text):
    # every word as said, numbers included, for placing the cuts (a number or a Hindi word the model writes
    # differently still takes up its place between the lines)
    return re.findall(r"[a-z0-9']+", re.sub(r"<[^>]+>", " ", text.lower()).replace("-", " "))

def align(job, model):
    # Cutting by ear (14 Oct: Gemini's real delivery did not leave pauses the silence cutter could trust, and it read
    # the instructions out loud before the lines): the whole take is transcribed with a time on every word and the
    # script's words are matched to the heard words in order. Between two lines, the heard words that matched neither
    # (a number written as digits, "Bilkul" heard as something else) sit between them, and the cut goes at the
    # longest pause among them.
    segs, _ = model.transcribe(audio(job["take"]), language="en", beam_size=1, word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    heard = [(t, w.start, w.end) for s in segs for w in (s.words or []) for t in tokens(w.word)]
    script, owner = [], []
    for k, line in enumerate(job["lines"]):
        for w in tokens(line): script.append(w); owner.append(k)
    m = {}
    for b in SequenceMatcher(None, script, [h[0] for h in heard], autojunk=False).get_matching_blocks():
        for i in range(b.size): m[b.a + i] = b.b + i
    n = len(job["lines"])
    idx = [[i for i in range(len(script)) if owner[i] == k] for k in range(n)]
    hit = [[i for i in ix if i in m] for ix in idx]
    if any(len(h) == 0 for h in hit): return {"ok": False, "why": f"line {next(k for k, h in enumerate(hit) if not h) + 1} not heard"}
    cuts = []
    for k in range(n - 1):
        a, b = m[max(hit[k])], m[min(hit[k + 1])]
        if b <= a: return {"ok": False, "why": f"lines {k + 1} and {k + 2} heard out of order"}
        tail = max(idx[k]) - max(hit[k])           # words of line k said after its last matched word
        lead = min(hit[k + 1]) - min(idx[k + 1])   # words of line k+1 said before its first matched word
        # the cut goes at the longest pause between the two matched words (Gemini pauses between lines: 2.3 s before
        # "Bilkul" on 14 Oct, where "2024" was one heard word for three script words and a count went wrong); with no
        # real pause, the unmatched words are shared out by how many each line has at that edge
        pauses = [(heard[i + 1][1] - heard[i][2], i) for i in range(a, b)]
        longest, at = max(pauses)
        if longest < 0.25:
            gap = list(range(a + 1, b))
            give = round(len(gap) * tail / (tail + lead)) if tail + lead else len(gap) // 2
            at = gap[give - 1] if give > 0 else a
        cuts.append(round((heard[at][2] + heard[at + 1][1]) / 2, 3))
    start = max(0.0, heard[m[min(hit[0])]][1] - 0.15 - 0.4 * (min(hit[0]) - min(idx[0])))
    end = heard[m[max(hit[-1])]][2] + 0.25 + 0.4 * (max(idx[-1]) - max(hit[-1]))
    return {"ok": True, "cuts": cuts, "start": round(start, 3), "end": round(end, 3)}

def main():
    job = json.load(open(sys.argv[1]))
    from faster_whisper import WhisperModel
    model = WhisperModel(job.get("model", "base.en"), device="cpu", compute_type="int8")
    if job.get("take"):
        out = align(job, model)
        json.dump(out, open(sys.argv[2], "w"))
        print(f"align: {len(job['lines'])} lines, " + ("cut by ear" if out["ok"] else f"not cut ({out['why']})"))
        return
    heard = []
    for p in job["pieces"]:
        segs, _ = model.transcribe(audio(p["wav"]), language="en", beam_size=1, vad_filter=False, condition_on_previous_text=False)
        heard.append(" ".join(s.text for s in segs).strip())
    want = [words(p["text"], True) for p in job["pieces"]]
    got = [words(h, False) for h in heard]
    out = []
    for i, (w, g) in enumerate(zip(want, got)):
        own = f1(w, g)
        if len(w) < 3:
            ok = len(g) <= len(w) + 5  # a short reaction stays short
        else:
            near = [f1(want[j], g) for j in (i - 1, i + 1) if 0 <= j < len(want) and len(want[j]) >= 3]
            # lenient on the words (an accent, a Hindi word or a name can be misheard); strict on order and length: a
            # piece closer to a neighbouring line, or far longer than its own, is a cut in the wrong place
            ok = own >= 0.35 and all(own >= x for x in near) and len(g) <= 1.6 * len(w) + 4
        # a cut in the wrong place leaks words across the edge (17 Oct: "Jude Bellingham has agreed an extension", the
        # end of one line, played as the start of the next, after the other host had answered): the piece must not
        # open with the last words of the line before or close with the first words of the line after
        leak = edge_leak(g, w, want[i - 1] if i > 0 else [], want[i + 1] if i + 1 < len(want) else [])
        if leak: ok = False
        out.append({"f1": round(own, 2), "ok": ok, "heard": heard[i][:300], **({"leak": leak} if leak else {})})
    for i in misplaced(want, got):
        out[i]["ok"] = False; out[i]["moved"] = "words of another line"
    for i in stray_edges(want, got):
        out[i]["ok"] = False; out[i]["moved"] = "a word across the cut"
    # names said as other names: the cut stands, and the caller voices those lines again (voice.mjs)
    all_names = sorted({n for t in job.get("script", [p["text"] for p in job["pieces"]]) for n in proper_names(t)})
    swaps = name_swaps([p["text"] for p in job["pieces"]], heard, all_names)
    for i, why in swaps.items(): out[i]["swap"] = why
    json.dump({"ok": all(x["ok"] for x in out), "pieces": out, "swaps": sorted(swaps)}, open(sys.argv[2], "w"), indent=1)
    bad = [i for i, x in enumerate(out) if not x["ok"]]
    print(f"verify: {len(out)} lines, {len(out) - len(bad)} match" + (f"; line(s) {', '.join(str(i + 1) for i in bad)} do not" if bad else "") + "".join(f"; line {i + 1} {why}" for i, why in sorted(swaps.items())))

if __name__ == "__main__":
    main()
