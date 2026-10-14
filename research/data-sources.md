# Score data sources: tested (15 Oct 2026)

What the show uses now:

| Sport | First | Backup | Status |
|---|---|---|---|
| Football | ESPN site API | Sofascore (keyless), wired | both checked on Roma 3-4 Real Madrid |
| Cricket | Cricbuzz pages | ESPN cricket API (the paper's backup) | to wire |
| F1 | Jolpica | OpenF1 (keyless) | to wire |
| Tennis | ESPN | Sofascore (ids in profile) | to wire |
| NBA | ESPN | Sofascore (ids in profile) | to wire |

## Grok's list, tested
| Source | Key | Result |
|---|---|---|
| football-data.org | free key | works with a token (Parth already has one in Vercel as `football` for the paper); 403 without. Good third source for football |
| OpenLigaDB | none | live for the Bundesliga only; its Champions League and La Liga data stop in 2016-17. Not useful for Madrid |
| ESPN site API | none | already the first source |
| TheSportsDB (test key 3) | test key | out of date: Alcaraz search returns the Laver Cup (25 Sep), and the Warriors id it gives returns other teams' games. Not reliable |
| CricketData (CricAPI) | free key | needs a key; not tested. Option if Cricbuzz and ESPN cricket both fail |
| Jolpica, OpenF1 | none | already in use and checked |
| SportScore | none | works and has Alcaraz's loss to Bergs, but only the first 100 matches of a day, with no paging and sets only. A last resort for tennis at most |
| BALLDONTLIE | free key | needs a key (401 without); not tested |

Waiting for: Gemini's and ChatGPT's lists (research/PROMPT-DATA.md).
