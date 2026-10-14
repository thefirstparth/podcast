# Sources for Parth's show: merged list for approval (15 Oct 2026)

Merged from Claude's research and the lists from Grok, Gemini and ChatGPT. Every feed was checked by `scripts/feed-check.mjs`:
- Results: `research/candidates-results.md`, `research/google-news-results.md`, `research/llm-candidates-results.md`.
- English only.
- **Text** = alive, fresh and its articles can be read.
- **Signal** = paywalled or blocked: it counts towards "how many outlets ran this", and the writer never sees its text.

Every subject also has its Google News headline search (`intitle:`).

## Proposed

| Subject | Text sources | Signal only |
|---|---|---|
| **Real Madrid** | Managing Madrid, Football España (Real Madrid), The Guardian (Real Madrid), Madrid Universal | The Athletic |
| **India men's cricket** | Hindustan Times, Indian Express, Times of India, The Hindu, Sportstar, Wisden, The Guardian (cricket), BBC (cricket) | ESPNcricinfo (India) |
| **F1 and Max** | Formula 1, The Race, PlanetF1, Motorsport.com, Autosport, RaceFans, RacingNews365, BBC (F1), Sky Sports (F1), The Guardian (F1), FIA | |
| **Tennis** | Tennis Majors, BBC (tennis), The Guardian (tennis), Tennis365, Ubitennis, Sky Sports (tennis); Google News for "ATP tennis" | ESPN and Reuters through Google News |
| **Warriors** | Golden State of Mind, SFGate (Warriors feed), CBS Sports (NBA); SI and NBC Sports Bay Area through Google News | The Athletic, RealGM, Yahoo Sports (NBA) |
| **Ronaldo** | Google News for "Ronaldo" and "Al Nassr", plus the football desks below | |
| **Barcelona (rival)** | Barca Blaugranes, Barca Universal, Football España (Barcelona), The Guardian (Barcelona) | |
| **World football** | BBC (football), BBC (Champions League), The Guardian (football), Sky Sports (football), CBS Sports (soccer), Football Italia, Get French Football News; The Independent (sometimes) | The Athletic |
| **Other sport** | BBC Sport, The Guardian (sport), Sportstar, Indian Express (sports), The Hindu (other sports), BBC (athletics), BBC (golf), ChessBase, Chess.com | |

The thin spots are filled: tennis goes from three readable sources to six, and the Warriors from one to five.

## Left out, and why

| Source | Why |
|---|---|
| Marca, AS, Mundo Deportivo, Diario SPORT, Bernabéu Digital, kicker, A Bola, RTP, Maisfutebol | not in English |
| Cricbuzz "live feed" (Gemini), PortuGOAL (Gemini), Goal.com (Gemini), ESPN golf, tennis, NBA and soccer feeds, ATP Tour, Tennis World USA, Tennis.com, GPblog, Football365, Warriors Wire, Mercury News, Arab News | dead or blocked when checked |
| Bleacher Report | alive, but one feed of everything (about 600 items) and mostly aggregation; too noisy |
| Sports Mole | mostly previews and predictions |
| Crash.net | readable, but no summaries; F1 already has eleven sources |
| SB Nation's general F1 feed | thin next to the F1 specialists |
| CricTracker, RevSportz | CricTracker: readable but mostly aggregation; RevSportz: signal only. The Indian dailies cover the same ground |

Grok's "no feed" list was partly wrong: RaceFans, Autosport and Golden State of Mind all work.

## Questions
1. Approve as proposed, or add or drop anything?
2. Keep ESPNcricinfo as signal only? It's the best cricket outlet, but its articles can't be read.
3. Chess (ChessBase, Chess.com) for The Sidelines: in or out? Your paper covers Indian chess stars there.
