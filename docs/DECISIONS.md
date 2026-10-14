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
