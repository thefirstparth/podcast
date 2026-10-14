# Proposed sources for Parth's show (15 Oct 2026), for approval

Every feed below was checked today by `scripts/feed-check.mjs` (full results: `research/candidates-results.md`).
- **Text:** alive, fresh, and its articles can be read, so the writer may retell them.
- **Signal:** alive but paywalled or blocked. It only counts towards "how many outlets ran this story", and the writer never sees its text.

Each subject also keeps its Google News search, now limited to headlines that name it (`intitle:`), which reaches outlets that have no feed. A `site:` search reaches one outlet that has no feed of its own (AS English works; Cricbuzz is signal only).

| Subject | Text | Signal | Dead (left out) |
|---|---|---|---|
| Real Madrid | Managing Madrid, Madrid Universal, Football España, AS English via Google News | The Athletic, ESPN via Google News | realmadrid.com; Marca and AS (Spanish) left out: English only |
| India men's cricket | Hindustan Times, Indian Express, Times of India, The Hindu, Sportstar, CricTracker, Wisden | ESPNcricinfo (both feeds), NDTV Sports, Cricbuzz via Google News | |
| F1 and Max | Formula 1, PlanetF1, Motorsport.com, Autosport, RaceFans, RacingNews365, BBC F1, SB Nation F1, FIA; The Race (sometimes) | | GPblog |
| Tennis | Tennis Majors, BBC tennis, Tennis365; Google News headline searches for Alcaraz, Djokovic and "ATP tennis" (sometimes readable) | ESPN, Reuters and Tennis.com via Google News | ATP Tour, ESPN tennis feed, Tennis World USA, Tennis.com feed |
| Warriors | Golden State of Mind; SFGate, Sports Illustrated and NBC Sports Bay Area via Google News (`site:`); Hoops Rumors (sometimes) | The Athletic, ESPN via Google News | Warriors Wire, Mercury News feed, ESPN NBA feed |
| Ronaldo | Google News headline search for Ronaldo; "Al Nassr" search (sometimes) | ESPN via Google News | Arab News |
| Barcelona (rival) | Barca Blaugranes, Barca Universal | | Mundo Deportivo (Spanish) |
| World football | BBC, Guardian, Sky Sports; BBC (sometimes) | The Athletic | ESPN FC (stopped working since yesterday), Football365 |
| Other sport | BBC Sport, Guardian sport, Sportstar, Indian Express sports | | ESPN top |

**English only** (Parth, 15 Oct): Spanish sources are left out, and the code drops any headline that reads as another language.

**Thin spots, filled with Google News** (results: `research/google-news-results.md`):
- The Warriors now have four readable sources: SFGate, SI and NBC Sports Bay Area, reached by `site:` searches.
- Tennis and Ronaldo have headline searches.

Tennis is still the thinnest and is where your Gemini or ChatGPT research helps most.

Open question: ESPNcricinfo can't be read, but it is the best signal for cricket. Keep it as signal only?
