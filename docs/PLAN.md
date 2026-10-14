# The sports show: plan (draft 1, 14 Oct 2026)

Status: a plan for review. Nothing is built yet. Decisions marked **[Parth]** are open and need your call.

## 0. What already works (The House of 1400 podcast, read from the repo)

1. **Trigger.** `.github/workflows/podcast.yml` runs when the daily edition (`content/latest.json`) is pushed, at about 14:12 IST. Backup runs go at 14:40 and 15:25 IST.
2. **Running order, built by code** (`scripts/podcast/lib.mjs` `rundown`). It takes the edition's stories by Bhide's importance scores, with config weights (sport 1.2x, Real Madrid 1.07x), plus the Fixture List, money, the Betting Window and the House Note. Nothing from outside the paper gets in.
3. **Script, written by Gemini on the free tier** (`make.mjs` `writeScript`). It tries 3.8 Flash first and waits while it is busy. Then it rotates through 3.7, 3.6 and 3.5 Flash, then Flash Lite, then a plain script made by code. Each writer is capped at 15 of its roughly 20 free requests a day.
4. **Script checks** (`checkScript`): only the paper's facts, each market figure said once, 1,050 to 1,550 words, no laughter near bad news, "back home" only for Ranchi and Prayagraj. A failed script goes back to the writer with the reasons, up to twice.
5. **Voice: Gemini TTS, in the "solo" form.** Each host's lines are voiced in one single-voice take, then cut at the pauses. The lesson from 13 Oct was that per-line moods made the voices drift, so the feeling now comes from the words. The free tier allows roughly 10 voice requests a day.
6. **Listening check.** faster-whisper (base.en, on the runner's CPU) hears every cut piece and checks it says its own line.
7. **Studio** (`studio.mjs`): two mics panned 12% each way, natural gaps, EQ and compression, then an MP3 and a WebVTT transcript.
8. **Fallback.** If every Gemini voice fails, a second job voices the same script with Kokoro, an open-source voice model that runs on the runner's CPU.
9. **Publishing.** The MP3, the VTT and `feed.xml` go to a private Vercel Blob folder. `api/podcast.js` serves them at `house14.vercel.app/listen`. Episodes are kept 14 days. A Telegram message goes out.
10. **Cost:** nothing, on the Gemini free tier, GitHub Actions and Vercel Hobby.

What this tells us for the new show:
- The hard parts are already solved and proven: the writer's fallback chain, quota handling, voice consistency, the listening check, the studio, the feed and the Apple and Spotify listing. **We copy them. We never import from or change house-of-1400.**
- The weak point for a public product is the source. The current show depends on a newspaper that a Claude routine researches and writes every day. That cannot be replicated for free by anyone else. **The new show must get its facts from code-fetched data, not from a Claude run.**
- Free quotas are per Google Cloud project. **The new show needs its own Gemini key in a separate Google project**, so it can never take a request from the 14:00 show.

## 1. The idea, expanded

### What it is
A personal sports radio show, built for one fan. Two hosts talk through what happened to *your* teams and players since the last episode, what is coming next, and the wider sport worth knowing. They feel it the way you do: gutted when Madrid lose, angry when they lose badly, and openly delighted when Barcelona drop points.

### What makes it worth paying for (and worth using every day)
1. **It takes your side.** Every sports podcast is neutral or follows one club. None of them share *your* mix of loyalties (Madrid and the Warriors and India and Max), and none of them celebrate your rival's bad day. This is the hook.
2. **It only covers what you care about,** in the order you care about it, at the length the day deserves. On a quiet Tuesday it runs 4 minutes. On a Clasico Sunday it runs 10.
3. **It never pads.** If nothing happened, it says less. This rule is carried over from the paper.
4. **It arrives when you want it**, timed in your zone, with fixtures given in your local time.

### The emotional engine (the core of the product)
Mood is **decided by code, not left to the AI**, so it is consistent and testable. For every item:

- **Stance**, from your profile: `love` (your team or player), `rival`, or `neutral`.
- **Outcome**, from the data: win, draw, loss, knocked out, title, podium, DNF and so on.
- **Weight**, from the data: the stage (a final or knockout counts more than a league game), the margin, whether it was an upset, a lead thrown away, a streak, a red card.
- **Mood** comes from one small table, editable in config:

| Stance | Outcome | Mood (examples) |
|---|---|---|
| love | big win, title, final | elated |
| love | ordinary win | happy, relieved (if it was close) |
| love | draw | frustrated, or relieved (if they came from behind) |
| love | narrow or unlucky loss | gutted |
| love | heavy loss, lead thrown away, loss to a weak side | angry |
| love | knocked out | heartbroken |
| rival | loss or draw | gleeful, smug |
| rival | heavy loss or knocked out | full celebration (your "Rival Watch") |
| rival | win | **never mentioned** |
| neutral | anything | even, interested |

- **Intensity** follows how much you care (see the care levels below). A die-hard loss is said with real feeling. A big-moments-only player gets a calm line.
- **Guardrails, enforced by code:** a rival's win never makes the script, checked hard. We celebrate results, never injuries, illness or anything personal. No laughter in a sad segment. Swearing only if the profile allows it (and then the feed is marked explicit).

The mood reaches the listener three ways, in order of reliability:
1. **Words.** The writer gets each segment's mood and writes in that register. The checks reject a mismatch. This is the proven lever (13 Oct lesson).
2. **Delivery.** Gemini TTS takes natural-language direction ("gutted, slower, quieter"). This must be tested first: the house show found that per-line moods made voices drift. The plan is one take per host per mood block, or inline direction inside a solo take. Phase 0 tests both.
3. **Studio.** Pacing (longer gaps after bad news) and, later, short stings for a win or a loss. Music is off until it sounds right, as on the house show.

### Care levels (the "scoring" mechanism, kept simple)
Three levels plus rivals. Nothing more to learn.

| Level | What you get | Internal weight |
|---|---|---|
| **Die-hard** | every match, full segment, previews, news, real emotion | 3 |
| **Follow** | results, standings, important news, short | 2 |
| **Big moments** | only finals, titles, records, huge news | 1 |
| **Rival** | only when they lose, draw or go out | special |

The weight sets three things at once: **order** (the lead is the item with the highest care x weight of the day), **word budget** (each segment's share of the episode) and **emotional intensity**. Users who want control can pin a fixed order instead of "by care".

### Your profile, as the engine would read it (draft; confirm the levels)
```json
{
  "listener": { "name": "Parth", "tz": "Asia/Kolkata", "language": "en-IN" },
  "follows": [
    { "sport": "football",   "team":   "Real Madrid",           "care": "die-hard" },
    { "sport": "cricket",    "team":   "India men",             "care": "die-hard" },
    { "sport": "f1",         "driver": "Max Verstappen",        "care": "die-hard" },
    { "sport": "tennis",     "player": "Carlos Alcaraz",        "care": "die-hard" },
    { "sport": "tennis",     "player": "Novak Djokovic",        "care": "follow" },
    { "sport": "basketball", "team":   "Golden State Warriors", "care": "follow" },
    { "sport": "football",   "player": "Cristiano Ronaldo",     "care": "big-moments" },
    { "sport": "f1",         "all": true,                       "care": "follow" },
    { "sport": "tennis",     "all": true,                       "care": "follow" }
  ],
  "rivals": [ { "sport": "football", "team": "FC Barcelona" } ],
  "wider": { "football": "follow", "other_sports": "big-moments", "india_at_big_events": "follow" },
  "tone": { "emotion": "full", "rival_watch": true, "language": "clean" },
  "order": "by-care",
  "length": { "min": 4, "max": 10 }
}
```
"Wider" covers The Wider Pitch (football beyond Madrid: transfers, managers, big results) and The Sidelines (every other sport when it clears the bar, India at multi-nation events) from the paper.

### Running order (default)
1. **Cold open**: one line on the day's biggest moment for you, in its mood ("Barcelona lost at home. Let's start there." or "Not a good night, Madrid.").
2. **Your die-hards**, by care x weight: result, how it happened, what it means (table, standings, the draw), what is next.
3. **Rival Watch**: only on days a rival slipped. A short, named segment. Skipped otherwise, with no line about it.
4. **Your follows**: brisk.
5. **Around the grounds**: the Wider Pitch and Sidelines items that cleared the bar, as quick hits.
6. **The week ahead**: your fixtures in your time zone, with what is at stake and, optionally, the betting markets' view (the paper's Betting Window idea).
7. **Sign-off**: a fixed line, the same every day.

### Hosts: one or two?
**Recommendation: two hosts for you, with one host as an option for others.**
- **The Fan** carries your allegiances and your emotions. Elated, gutted, angry, gleeful. They are effectively you.
- **The Anchor** keeps the facts straight, explains the table, asks "hang on, why?", and teases the Fan a little. The contrast is what makes the emotion believable. One voice being angry for ten minutes is tiring. One angry voice next to a calm one is radio.
- A single-host "quick" mode is cheaper (one voice request) and suits people who want 3 minutes. The engine supports both from one setting.
- New names and voices, never family. You pick from samples, as with Ashu and Tarun.

## 2. How the facts are gathered

You suggested Claude provides the data. For you alone that is possible (the paper already does it). It cannot scale: a daily Claude run per user is neither free nor something a friend can set up. So:

**Layer 1: results and fixtures, fetched by code (exact, no AI).** Keyless public sources the paper already proved:
- Football: ESPN's site API (any team, any league, results, fixtures, tables, goal minutes). football-data.org as backup.
- F1: Jolpica (Ergast) and OpenF1.
- Tennis: ESPN's ATP and WTA scoreboard and rankings.
- Cricket: ESPN's cricket API, with Cricbuzz times.
- NBA: ESPN.

Because ESPN covers almost every league and sport by team id, a new user's teams usually need no new code: just ids. A setup step looks the ids up from names.

**Layer 2: news, fetched by code, chosen by the writer.** RSS from the sport desks the paper reads (BBC, Guardian, ESPN FC, Motorsport.com, ESPNcricinfo, Tennis Majors and others), plus a Google News search feed per followed name. Code ranks by agreement: a story that two or more outlets run is news. Only the top few go to the writer, as short summaries with their source.

**Layer 3, for you only (optional): The House of 1400's sport desk.** Your paper is a better editor than any RSS ranking. The engine can read the latest edition's Madridismo, Paddock Notes, The Crease, Deuce, The Wider Pitch and The Sidelines as a trusted "editor's picks" input. It does this read-only, so it never changes the paper. Others run without it.

**The rule carried over from the paper:** the writer may only use facts in the day's data pack. The checks reject anything else. No web search by the AI in version 1, because grounded search brings facts we cannot check.

## 3. Engines (all free)

| Job | First choice | Fallback | Why |
|---|---|---|---|
| Script | Gemini Flash (the newest your key lists, as now) | older Flash models, then Flash Lite, then a plain script made by code | proven chain; one write and up to two rewrites is about 3 of roughly 20 daily requests |
| Voice | Gemini TTS, solo takes per host | Kokoro (open source, CPU) | Gemini takes emotional direction; Kokoro keeps the show alive when Gemini fails, but it is flatter |
| Listening check | faster-whisper base.en (CPU) | skip the solo cut that day | proven |
| Mixing | ffmpeg (studio.mjs) | none needed | proven |
| Schedule | GitHub Actions cron | backup crons | proven |
| Hosting | see the decision below | | |

Budget per episode: 1 to 3 text requests and 2 to 4 voice requests. That is well inside one free key, with room for a redo and a test.

Not in version 1: other text providers (Groq, OpenRouter free models) as an extra fallback. They are worth adding only if Gemini's free tier shrinks.

## 4. Tech stack and repo

- Repo: `thefirstparth/podcast`, new and empty, created today. Plain JavaScript on Node 22, like the paper. Python only for whisper and Kokoro.
- Layout:
  - `profile.json`: who you are and what you follow. The only file a user edits.
  - `config/show.json`: hosts, voices, mood table, lengths, pronunciations.
  - `engine/fetch/*.mjs`: one fetcher per sport, ported from the paper's `lib/`.
  - `engine/moods.mjs`: stance x outcome x weight to mood, pure code, with tests.
  - `engine/rundown.mjs`, `engine/writer.mjs`, `engine/checks.mjs`.
  - `engine/voice.mjs`, `studio.mjs`, `verify_lines.py`, `kokoro_voice.py`: copied from the house show.
  - `engine/feed.mjs`.
  - `.github/workflows/episode.yml`.
  - `tests/`: recorded payloads, so the logic is tested offline, as in the paper.
- Secrets, added by you in GitHub: `GEMINI_API_KEY` (from a **new** Google project). Possibly a hosting token, depending on the decision below.
- **Hosting decision [Parth]:**
  - **A. Make this repo public** (recommended). The code holds no secrets. The feed goes on GitHub Pages and the MP3s go in GitHub Releases. Both are free with no new accounts, and public repos get unlimited Actions minutes. It also becomes the template friends copy. Your profile (your teams) would be visible.
  - **B. Keep it private** and publish through a separate Vercel Blob store, like the house show. This shares the free Vercel team that already hit 75% of its storage on 14 Oct. It also shares the 2,000 free Actions minutes a month with the house show's runs.

## 5. Plan, in phases

### Phase 0: prove the risky parts (one session, nothing published)
1. A new Gemini key in a new Google project. List its models and confirm the quota is separate from the house show's.
2. **Emotion test.** The same four lines voiced as elated, gutted, angry, gleeful and neutral, in two methods (one take per mood block, or inline direction in one solo take). You rate them. This decides whether delivery can carry mood or only the words can.
3. **Data test.** Fetch the last 3 days for every item in your profile, Barcelona included, and print the data pack and the moods the code assigns. You check them against what really happened.
4. Pick hosts: voice samples, names, and which one is the Fan.

### Phase 1: your show, private feed (about a week)
1. Port the fetchers and write the mood engine and the rundown, with offline tests.
2. Write the writer prompt and checks. The new hard checks: no rival wins, mood and words agree, every fact is in the pack, the length fits the day.
3. Voice, studio, listening check and feed, copied from the house show.
4. Dry runs (script and MP3 as artifacts, nothing published). Then a private feed you add in Apple Podcasts with "Follow a Show by URL".
5. A week of daily episodes, with your ratings after each, as with the house show. Every complaint becomes a rule in `docs/DECISIONS.md`.

### Phase 2: make it yours for good
Listing on Apple and Spotify if you want it public, chapters, mood stings, a Telegram ping, and optional reading of the House of 1400 sport desk if Phase 1 shows RSS ranking falls short.

### Phase 3: friends (replicable in about 10 minutes)
1. Make the repo a GitHub template. A setup page (a static form) asks for teams, players, rivals, care levels, tone, time and language, and outputs `profile.json`.
2. The setup is 5 steps: use the template, get a free Gemini key from AI Studio, add it as a secret, paste `profile.json`, turn on Pages. Then add the feed URL to the podcast app.
3. Two or three friends with different sports, for example an Arsenal and NFL fan. This tests that nothing about you is hard-coded. We count how long setup takes and where they get stuck.
4. Note: Spotify cannot follow a private RSS link, so personal feeds go in Apple Podcasts, Pocket Casts, Overcast or AntennaPod.

### Phase 4: paid (only after friends keep listening)
Suggested gate: friends listen on at least 4 days a week, for 3 weeks, without being reminded. Then:
- **Hosted version:** sign in, pick teams, get a private feed. No GitHub, no keys. This needs paid APIs, so we measure the real cost per episode first and only then set a price.
- **Shared segments cut the cost.** Every Madrid fan who wants "gutted, two hosts" can share one voiced Madrid segment. Only the intro and the ordering are personal. Voice is the expensive part, so this matters.
- **One show per club** (for example a daily Madrid show) as public listed podcasts: cheap, findable on Spotify, and a route to the personal paid version.
- **Gates before charging money:** licensed sports data (ESPN's API is unofficial: fine for personal use, not for a paid product), summarising news rather than reading it out, no club logos or marks, and the Gemini paid-tier terms.

## 6. Questions for you, one at a time
1. Hosting: A (public repo, GitHub Pages) or B (private, Vercel)?
2. When should the episode be out (IST)? Madrid's night games end about 02:30 IST and Warriors games about 10:30 IST, so anything from about 11:30 catches the night. Should it come before the 14:00 paper or after it?
3. Care levels: is the draft profile right? Djokovic at Follow? Warriors at Follow? Ronaldo at Big moments?
4. Other rivals: Atletico? In F1, McLaren, Norris or Hamilton? In tennis, Sinner? In cricket, Pakistan or Australia? In the NBA, the Lakers or the Celtics?
5. Swearing: clean, or mildly salty? Salty means the feed is marked explicit.
6. Working name, and two new host names (not family).
7. Should the new show read The House of 1400's sport desk (Layer 3) from day one, or only the public sources?
8. Language: English only, or a little Hinglish from the Fan?
