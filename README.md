# Sports show

A personal sports podcast: two hosts talk through what happened to the teams and players you follow, in the mood you would feel it, and what is coming up. Free to run: Gemini's free tier, GitHub Actions and GitHub Pages.

Work in progress. Start with `docs/PLAN.md`, then `docs/STRUCTURE.md`.

- `profile.json`: who the show is for and what they follow. The only file a listener edits.
- `config/show.json`: the running order, the moods and the rules that set them.
- `config/feeds.json`: the sport desks' news feeds.
- `engine/pack.mjs`: fetches the day's facts and builds the data pack (no AI). `node engine/pack.mjs --days=3`
- `rehearsals/`: data packs and scripts made for review.

Tests: `npm test`
