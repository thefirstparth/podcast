# Research prompt for Gemini or ChatGPT (copy everything below the line)

Paste the answer back to Claude as is. Claude checks every feed with `scripts/feed-check.mjs` before anything is used, so a guessed or broken link costs nothing, but please ask the assistant to only list feeds it has seen.

---

I am building a personal sports podcast that is made automatically every day by code. The code reads news from RSS or Atom feeds, groups reports of the same story, counts how many outlets ran it, and reads the article text so a script writer can retell it in its own words. I need the most reliable news sources for each of the subjects below.

Subjects:
1. Real Madrid (men's football)
2. India men's cricket team
3. Formula 1, especially Max Verstappen and Red Bull
4. Men's tennis, especially Carlos Alcaraz and Novak Djokovic
5. Golden State Warriors (NBA)
6. Cristiano Ronaldo (Al Nassr and Portugal)
7. FC Barcelona (a rival: only for spotting bad news about them)
8. World football in general (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League)
9. Other sport worldwide, with an Indian angle welcome (hockey, badminton, athletics, chess, kabaddi, golf, the Olympics)

For each subject, find 4 to 8 sources. Mix the kinds: official (club, league, governing body), national or international outlets with a sports desk, the subject's best beat reporters or specialist sites, and well-run fan sites (for example the SB Nation network).

Rules:
- The link must be the RSS or Atom feed itself (the URL that returns XML), not the website's home page. If a site has a feed per team or per sport, give that one.
- Free to read only. Leave out any source whose articles are behind a paywall or a sign-in (for example The Athletic, The Times, Telegraph). A metered paywall counts as a paywall.
- No betting or tips sites, no fantasy-sports sites, no sites that only rewrite other outlets' stories, no AI-generated content farms, no video-only or social-media-only accounts.
- English first. A top club-specific outlet in Spanish or another language is welcome if it is the best source for that subject; say the language.
- Only list feeds you have actually seen working. Do not guess URL patterns. If a great source has no feed, list it separately with its website and say "no feed".
- Prefer sources that publish every day and that break news first.

Answer with one JSON array and nothing else, one object per source, in exactly this format:

[
  {
    "for": "Real Madrid",
    "name": "Managing Madrid",
    "url": "https://www.managingmadrid.com/rss/current.xml",
    "kind": "fan site | beat outlet | national outlet | official | wire",
    "language": "en",
    "paywall": "none",
    "updates": "several a day | daily | weekly",
    "why": "one line on why it is reliable"
  }
]

Then, after the JSON, a short list titled "No feed" of great sources that have no RSS or Atom feed, with their website.
