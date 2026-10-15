# Status (15 Oct 2026, end of day)

## Done and approved
- **The plan** (`docs/PLAN.md`): a personal sports show, free, built for Parth first and others later.
- **The data, all code, no AI:** results from ESPN, Cricbuzz and Jolpica, each with a keyless backup (Sofascore, f1api.dev, ESPN cricket); news from an approved, checked, English-only source list; squads and rankings refreshed every run; a memory of what was said.
- **The structure and moods** (`docs/STRUCTURE.md`): running order approved; moods with a shape, a strength and context; Rival Watch; Around the grounds by drama score.
- **The writer** (`docs/WRITER.md`): rules for the ear, not the page. First rehearsal script approved ("I like the script, definitely!!!"); its two issues fixed (women's cricket ruled out; Barcelona may be mentioned inside a Madrid story).
- **Voices:** Fan **Zubenelgenubi**, Anchor **Algenib**, both Indian English (rounds 1 to 3).
- **Publishing time:** ready by 13:00 IST.
- **The episode run** (`engine/episode.mjs`, workflow `episode`): pack, script, voices (each host alone, every cut heard by the listening check), the 14:00 show's two-mic studio, the MP3 and transcript, then in live mode the GitHub Release, the feed (gh-pages) and the memory of what was said. No backup voice: a failed day nudges the listener to tell Parth. Live mode and the schedule are switched off until agreed.

## Next, in order
1. **Host names**: Parth is asking ChatGPT (`research/PROMPT-NAMES.md`).
2. **Technical test** (built, waiting for the voice limits to reset at 12:30 IST): Actions, then episode, then Run workflow with mode **test**. The full run on the rehearsal key, nothing published, about 3 writer and up to 6 voice requests. Claude checks it; Parth may listen to the MP3 in the run's artifacts.
3. **Before the first real episode** (Parth's steps, one at a time): make the repo public; turn on GitHub Pages (source: the gh-pages branch); agree how `GEMINI_KEY_LIVE` is used (it moves into a GitHub environment that only the daily run can open). Then the daily schedule is switched on: the run starts at 12:17 IST, the episode is ready by 13:00, and the first scheduled run is the first episode.
4. **Cover art** (needed before the feed is added to a podcast app) and the show's title.

## Parked
- Sports for everyone (`docs/PARKED.md`).
