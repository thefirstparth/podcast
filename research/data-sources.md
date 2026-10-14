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

## Gemini's and ChatGPT's lists, tested (keyless ones; the keyed ones repeat Grok's: football-data.org, CricketData, BALLDONTLIE, API-Football, tennis APIs on RapidAPI)
| Source | Result |
|---|---|
| FotMob API (`/api/teams`) | 404: the endpoint has moved |
| FotMob team page (`__NEXT_DATA__`) | works and is current (the Champions League table already had Roma's loss). A third football source if ever needed |
| ESPNcricinfo consumer API and team page | blocked (403, Akamai) |
| Formula 1 live timing (`livetiming.formula1.com/static/2026/Index.json`) | works, but raw timing streams that need a parser; kept in mind |
| f1api.dev | works, same driver ids as Jolpica; now F1's backup |
| ESPN tennis athlete overview (v3) | works, but it is ESPN again, so it is no backup for ESPN |
| ATP Tour JSON | blocked (Cloudflare) |
| NBA.com CDN (schedule, scoreboard) | blocked from here (Akamai); may work from GitHub's runners, untested |

## What the show uses now (all keyless, each backup checked live by breaking the first source)
| Sport | First | Backup | Then |
|---|---|---|---|
| Football | ESPN | Sofascore (Real Madrid won 4-3 at Roma, every goal the same) | football-data.org with Parth's token, if ever needed |
| Cricket | Cricbuzz | Sofascore (the same three results and the 2-2 series) | ESPN cricket, only on days India play |
| F1 | Jolpica | f1api.dev (Singapore: Verstappen, Leclerc, Antonelli; the same standings) | |
| Tennis | ESPN | Sofascore (Bergs bt Alcaraz 7-5 7-6) | |
| NBA | ESPN | Sofascore (both pre-season wins, the Portland game) | |
