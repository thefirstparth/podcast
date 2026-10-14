# Research prompt for Gemini or ChatGPT: free data sources for scores (copy everything below the line)

Paste the answer back to Claude. Claude tests every endpoint before anything is used.

---

I am building a personal sports podcast for my own use. Code (no AI) collects results, fixtures and standings every day. Today it uses ESPN's public site API (site.api.espn.com), Sofascore's public JSON (api.sofascore.com), Cricbuzz's web pages, Jolpica (the Ergast F1 API) and OpenF1. I want backups so that if one source breaks, the show still has correct scores.

Find free sources of structured sports data for each of these:
1. Football: results with goal scorers and minutes, fixtures, and league tables for La Liga, the Champions League and the other top European leagues, and any club (for example Real Madrid, Al Nassr) or national team (Portugal).
2. Cricket: India men's international results with scorecards, the series they belong to, and upcoming fixtures with start times.
3. Formula 1: race, sprint and qualifying results, driver standings, and the session timetable.
4. Men's tennis: match results and upcoming matches for a given player (Carlos Alcaraz, Novak Djokovic), and tournament draws.
5. NBA: game results and schedule for a team (Golden State Warriors), including pre-season.

What counts:
- Free, with no card. Best of all: no key at all (a public JSON endpoint, or the JSON a public website loads for its own pages). A free key from a simple sign-up is acceptable; say so.
- Structured data (JSON or XML), not news articles. Reading a page's embedded JSON (for example a Next.js `__NEXT_DATA__` block) is fine if you name it.
- Updated within an hour of a match ending.
- Not something that needs a browser to log in, or that blocks requests from servers.

For each source, give the exact endpoint with a real example (a real team or player id), what it returns, how fresh it is, any known limits (requests per minute or day), and whether you have seen it work recently. Do not guess endpoints. If you are not sure one still works, say so.

Answer with one JSON array and nothing else, in exactly this format:

[
  {
    "sport": "football",
    "name": "Sofascore team events",
    "example_url": "https://api.sofascore.com/api/v1/team/2829/events/last/0",
    "returns": "the team's recent matches with scores; goals per match from /event/{id}/incidents",
    "key": "none | free key (sign-up) | free key (no card)",
    "limits": "unknown | 10 requests a minute | 100 a day",
    "freshness": "within minutes | within an hour | daily",
    "seen_working": "yes, recently | not sure",
    "notes": "anything that matters: needs a browser user-agent, an id lookup endpoint, terms of use"
  }
]
