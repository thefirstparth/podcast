# Decisions

## 14 Oct 2026
- The repo will be public (GitHub Pages for the feed, Releases for the MP3s). Made public when the feed is first needed.
- Two Gemini keys in two separate Google projects: `GEMINI_KEY_REHEARSAL` for every test, `GEMINI_KEY_LIVE` for the real episode only. Free limits are per project. The live key is in GitHub but unused until Parth and Claude agree how it is used.
- The script is approved before any audio is made.

## 15 Oct 2026 (Parth's review of the first data pack)
- Running order confirmed: cold open, your teams, Rival Watch, also on your list, around the grounds, coming up, sign-off.
- Moods confirmed, made more dynamic: each result has a shape (where the mood turned, from the goals), a strength from 1 to 5, and context (form, derbies, a rival dropping points the same day).
- The league table, rival included, is said only with a loved side's league result, after it. Never on other days.
- News is fetched by code, never by the writer: sport desks, team desks (SB Nation sites and others, Atom or RSS), and a Google News search per name, followed to the publisher's page. A match report becomes colour for its result; other stories stand alone with their text.
- Around the grounds: at most two items from outside the list, chosen by a drama score (big clubs beaten or held by smaller ones, heavy defeats, goal-fests, cricket upsets and huge wins, sackings, bans, records). Rules still under discussion.

## 15 Oct 2026 (later)
- Length is the listener's setting: target 8 minutes, never more than 9; a quiet day is shorter, never padded.
- Rival news only when important: a ban, sacking, fine, points deduction, crisis or exit, from three or more outlets (two if one is the rival's own desk). Never personal, never about the listener's own players.
- Memory of what was said is kept simple and leans towards repeating rather than missing (Parth: "I would rather hear something about it in two consecutive podcasts than miss something important"). A result is remembered by its match id; a story only by its exact links. Only published episodes are recorded; the next window starts at the last one.
- Matching news to subjects is code that keeps working as squads change: aliases and "not" phrases live in profile.json as plain words; each team's squad is pulled from ESPN every run (a new signing counts from the day ESPN lists him), with the last squad that loaded kept in ledger/squads.json for days ESPN is down. A preview of a match that has since been played is dropped.
- Parked for later: "Sports for everyone", the sport web app as its own free project with sign-in (docs/PARKED.md).

## 15 Oct 2026 (evening)
- English sources only. Headlines that read as another language are dropped by code.
- Scores have a backup: Sofascore's public JSON (keyless) when ESPN fails, checked against ESPN on Roma 3-4 Real Madrid (every goal, minute and scorer the same). Football is wired; basketball and tennis next. A result's id is the team and the day, so the memory holds whichever source served it. Only ESPN's RSS news feeds broke on 15 Oct; its scores API is fine.
- Thin subjects get targeted Google News searches (`site:` for outlets with no feed, `intitle:` on the subject's search word in the profile).
- The writer's rules start from Bhide's banned list and the 14:00 show's fact rules; the Fan may feel out loud, the facts stay plain (docs/WRITER.md, for discussion).

## 15 Oct 2026 (night): the writer
- A podcast is not a newspaper (Parth: "Do not just blindly copy everything from Bhide"). The writer's facts rules come from the 14:00 podcast; its language is written for the ear. Strong words (stunning, incredible, historic) are allowed when earned, the same big word at most once an episode. Words nobody says out loud stay out. Bhide's print-only rules (em dashes, colons, quote marks, no feelings) are dropped. Full rules: docs/WRITER.md.
- Rival Watch gets more colour ("Barcelona were dreadful"), within the old limits (results and big bad news, never personal).
- The Fan feels it out loud and the facts stay plain; the Anchor is one notch calmer (Parth: "I love it").
- The script rehearsal: .github/workflows/rehearse.yml, run by hand, the rehearsal key only, at most three writer requests, no voice; pack, script and checks committed to rehearsals/<date>/.

## 15 Oct 2026 (night, later)
- No catch-all Google News search for a sport ("ATP tennis"; Parth disagreed). The fix for a missed story was in the code: (1) one story worded many ways is grouped by rare word pairs ("six kings", "kings slam"), not only by shared words; (2) a story belongs to a subject when any of its headlines names him, not only the lead one; (3) a follower of a whole sport (Men's tennis, Formula 1) gets that sport's biggest stories of the day. The Six Kings Slam postponement (seven outlets, 14 Oct) now reaches the show.
- A die-hard story that names the rival ("Vinicius to miss the Clasico against Barcelona") stays the die-hard's story and may be told as it is.

## 15 Oct 2026 (night, last)
- The source list is approved as proposed (Parth: "take a call"), now in config/feeds.json. ESPNcricinfo, The Athletic, RealGM and Yahoo Sports NBA are signal only (paywall: true): they count towards how many outlets ran a story, but their text is never read.
- Chess is out for Parth (profile.wider.skip_sports). For others, a sport's relevance follows their country (profile.listener.country, sports_wanted, skip_sports); the setup page will offer it per sport.
- Score backups: Sofascore for football (wired); OpenF1, ESPN cricket and Sofascore for tennis and the NBA still to wire. Grok's data list tested (research/data-sources.md): football-data.org is the one worth a key; OpenLigaDB, TheSportsDB and SportScore are not reliable enough.

## 16 Oct 2026: a backup for every score
- Every sport now has a keyless backup, each checked live by breaking the first source: football and tennis and the NBA and cricket fall back to Sofascore, F1 to f1api.dev; cricket then tries ESPN. Result ids are the subject and the day, so the memory of what was said holds whichever source served them. Gemini's and ChatGPT's data lists tested (research/data-sources.md): FotMob's page data is a possible third football source; ESPNcricinfo, ATP Tour and NBA.com block server requests.

## 16 Oct 2026: no backup voice for listeners
- Kokoro is not used as a backup voice for listeners (Parth: remove it). If Gemini cannot voice an episode, there is no episode that day, the next one catches up, and the listener is nudged to tell Parth: the failed run's summary carries a pre-filled GitHub issue on the public repo (GitHub emails Parth) and a pre-filled email. An automatic note with no click can come later through a small function on Parth's site.

## 16 Oct 2026: voice samples, Parth's choices
- Options before anything is made (Parth: "you need to ask me first. Give me options").
- Two male hosts: a younger Fan and an older Anchor. Accents to hear: Indian English, British English, and a mix. A first set of up to 4 clips (one day of the rehearsal key's voice requests).
- The first set is 3 clips (Parth chose D for the fourth): both Indian English; both British English; an Indian English Fan with a British Anchor. The fourth clip's voice requests are kept for a re-take after he hears these.

## 15 Oct 2026: Parth's review of the first rehearsal script ("I like the script, definitely")
- Women's cricket under India men "should not have slipped through": fixed with the profile's skip list (a story that names a skip word is ruled out entirely).
- Barcelona may be mentioned inside a Madrid story that is about them (the Clasico, the title race), said plainly. Rival Watch and the never-celebrate rule are unchanged.
- The greeting follows the publishing time, which is still to be decided.

## 16 Oct 2026
- Sports for everyone is parked again (Parth). The review and its four open decisions stay in docs/PARKED.md, untouched until he picks it up.

## 15 Oct 2026 (night): voice audition, round 1
- The Anchor is Algenib (Parth: "very mature"). Every Fan voice was too excited: Fenrir hated, Puck slightly too excited but better, Sadachbia slightly too excited. Charon "very bland", Sadaltager too bland, Orus not liked.
- Round 2 is proposed, not run: the Anchor stays Algenib; the Fan candidates are Puck, Umbriel, Zubenelgenubi and Algieba, with the Fan's direction toned down ("happy and animated but natural, not shouting"). Round 1 asked for "excited, thrilled", which pushed every voice over the top. Auditions now run in rounds from config/voices.json, with Parth's verdicts kept there.

## 15 Oct 2026: publishing time and the Fan's voice
- The episode is ready by 13:00 IST (Parth chose the recommendation): every overnight result is final by noon (the latest regular finishes are West Coast Warriors games and the Las Vegas GP, about 11:30 IST), the recaps are written by then, and it lands an hour before the paper. The run starts about 12:20 IST, with a backup run about 12:50. The Gemini reset (midnight Pacific: 12:30 IST to 31 Oct, 13:30 IST from 1 Nov) does not decide it, because the live key is used once a day, well inside its allowance.
- The Fan's voice is Zubenelgenubi (round 2); the Anchor is Algenib.
- No practice episode: the first scheduled run is the first real episode (Parth). Before it, one technical test of the voice and mixing code on the rehearsal key, checked by Claude, not listened to by Parth.
- Round 3 (ready): the chosen pair in three accents (both Indian English, both British, Indian English Fan with a British Anchor).

## 15 Oct 2026: the voices are settled
- Both hosts speak Indian English (Parth approved round 3's clip 1). Fan: Zubenelgenubi; Anchor: Algenib; the accent direction is the 14:00 show's proven description. The British and mixed clips are parked, not cancelled (Parth): the next run of round 3 makes them after the limits reset.
- Names: Parth is asking ChatGPT (research/PROMPT-NAMES.md); not decided yet.

## 15 Oct 2026 (afternoon)
- The repo is public (Parth). Checked before: no secrets in it, and no family details.

## 15 Oct 2026 (morning): Kylo and Dhruv; the first episode today
- The hosts (Parth, locked): **Kylo**, the Fan: warm, casual, emotionally invested; Madrid wins, Barcelona misery and Verstappen magic all hit him personally. **Dhruv**, the Anchor: older in temperament, gravelly, precise and composed; keeps the facts straight and quietly exposes Kylo's nonsense. Their dynamic: Kylo feels the result; Dhruv remembers what Kylo said before it happened. Built in: each published episode keeps Kylo's calls (his lines about what is coming), and the next episode's writer may have Dhruv quote one back, word for word, only from those.
- The first real episode is today, ready by 13:00 IST (Parth). The schedule is on: 12:17 IST, backup 12:47 IST; scheduled runs use the live key and publish. The live key is used only by the scheduled run and a redo Parth asks for, capped at 4 writer and 6 voice requests a run.
- The technical test (06:19 IST, rehearsal key) proved the pack, the writer, Kylo's voice, the cut by ear and the listening check (25 of 25 lines heard as written). It found two faults, both fixed: the older voice models refuse per-line speech metadata (they now get the conversation as one labelled text), and a busy writer is now waited out for a minute and the next model tried. Dhruv's take was not reached (the rehearsal key's voice limit was used up), so the first live run is also the first full run; Claude watches it and has time for a redo before 13:00.
- main is created from this branch after the first good episode (Parth: "yes, main").
- The hosts never call the listener by name (Parth: no). The writer's rule and its check stay as they are.
- The show's title and cover art come from Parth (he is working on them with ChatGPT). The cover goes in the repo root as cover.jpg; every publish copies it to the feed.
- The daily run starts at 12:28 IST, with a backup at 12:43 (Parth, 15 Oct: 12:17 was more margin than needed). Usually live by about 12:38; still before 13:00 after one hiccup. IST has no daylight saving and the run is scheduled in UTC, so 12:28 IST holds all year; the Gemini reset (12:30 or 13:30 IST) does not matter because the live key is used once a day.
- The show is called **Side Effects of Sports** (Parth, 15 Oct: "Sports is better" than Sport). It is the feed's title, the writer knows it, and the sign-off is "That's Side Effects of Sports for today. Same time tomorrow."
- The cover (Parth chose it from Claude's drafts): a capsule on pitch green, one half an F1 hairpin, the other half a cricket ball, a football, a basketball and a tennis ball; "Take daily" with no time, so a friend with another time can use it. `cover.jpg` in the root, 3000 x 3000, made by `design/cover.mjs`.
- **Where things stand, every day** (Parth, 15 Oct: "I would always want to know"; his examples are not rules, the code finds it each day). Code adds, for each team and player he follows (not the big-moments ones), to Coming up: where a series or championship stands (unless that day's result already says it), the next match when it is beyond the seven days, and the next series or tournament. Cricket from the team's Cricbuzz schedule (for India today: the 5th T20I decider, then the New Zealand tour, 5 T20Is, 5 ODIs and 2 Tests from 22 Oct); F1 the driver's championship place and the next race (Jolpica); football and the NBA the next match whatever its date (ESPN). Tennis has a limit: no free source says which tournament a player has entered until its draw is out (ESPN lists players only from the draw; the ATP site and Wikipedia refuse the run). So a player's next tournament is said only once he is in a draw, and men's tennis gets the tour's next tournaments. Nothing is guessed. Switched by `standing` in config/show.json: off for the first episode (15 Oct) so that run is the one already tested, on from the next.
- **One story, told once** (15 Oct, found in Parth's question about the Six Kings Slam). The postponement reached the pack as three Alcaraz stories: on a big story day its own words are too common to count as rare, so the first pass left it in pieces. A second pass now folds a piece into a story already chosen for the same subject (or the same sport, for Men's tennis) when their headlines share two distinctive phrases, one of three words or more, or one phrase of four words or more that says what happened. Followed names and a competition's name alone never join two stories (tested on the day's 1,242 headlines: 13 joins, all one story each). Today the postponement is one story from ten outlets, with its new dates (27 to 30 Dec) in the text the writer reads.
- **No data, no line** (Parth, 15 Oct). The writer was already told never to mention anything missing; a check now also sends back a script that says "no news yet on", "yet to be confirmed", "not announced yet" and the like.
