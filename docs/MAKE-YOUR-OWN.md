# Make your own show

This repo makes a daily sports podcast for one listener: your teams and players, felt the way you feel them, two hosts, about eight minutes. Code gathers the facts; Gemini writes and voices the conversation. It runs on free tiers only. Nothing here needs a card.

It takes about 30 minutes to set up. You need a GitHub account and a Google account.

## 1. Copy the repo
1. Fork this repo to your own GitHub account.
2. Open the Actions tab of your fork and press the button to enable workflows. GitHub leaves them off in a fork until you do.
3. Delete everything in `ledger/` and `rehearsals/`. That is the memory of someone else's show.

## 2. Tell it what you follow (`profile.json`)
`profile.json` is the only file about you.

- `listener`: your first name (the hosts never say it on air), your time zone (`tz`, for example `Europe/London`), language (`en-GB`), country, and optionally `city` ("Toronto, Canada").
- `follows`: one entry per team or player. Find the ids by name:

  ```
  node scripts/find-ids.mjs "Arsenal"
  node scripts/find-ids.mjs "Lando Norris" --sport=f1
  node scripts/find-ids.mjs "Australia" --sport=cricket
  ```

  It prints an entry ready to paste. Check that it found the right one (the first result is usually the senior team). Then:
  - set `care`: `die-hard` (every result, in full), `follow` (results, briefly) or `big-moments` (finals, titles, a goal in a big game)
  - add `aliases`: the words headlines use for them ("Gunners", "Arteta"). A team's players are added from its squad on every run.
  - add `not`: phrases that look like them but are not ("Arsenal Women", "Arsenal Sarandi")
  - add `skip`: words that rule a story out entirely
- Follow a whole sport with `{ "sport": "f1", "kind": "all", "name": "Formula 1", "care": "follow" }`.
- `rivals`: a team you love to see lose. It is mentioned only when it loses, draws or goes out, never when it wins, and never its injuries or anything personal.
- `wider.skip_sports`: sports you never want in the round-up.
- `length`: minutes, `target` and `max`.

Sports covered: football (clubs and national sides), cricket (international sides), F1, men's tennis and the NBA.

## 3. Name your show (`config/show.json`)
- `title`, `description` and `signoff`, the last line of every episode
- `owner`: your name and email, for the feed
- `hosts`: their names, voices and accents. To hear the voices first, set up a round in `config/voices.json` and run the voices workflow.
- `pronounce`: names the voices get wrong, spelled the way they sound
- `standing`: `true` to hear where each series or championship stands and what is next. `standing_by_care` sets how much for each care level: `now` (where a series or championship stands), `next` (the next match beyond the coming week) and `after` (the next series or tournament). By default a die-hard gets all three, a follow only `now`, and big moments nothing. One entry in `profile.json` can set its own list with `"standing": ["now", "after"]`.

For a cover, put a square `cover.jpg` (3000 by 3000) in the root. `design/cover.mjs` draws the capsule one. Change its balls and title for your sports.

## 4. Two free Gemini keys
In Google AI Studio (aistudio.google.com), create two projects and one API key in each. No card is needed.
- `GEMINI_KEY_REHEARSAL` is for tests and voice samples.
- `GEMINI_KEY_LIVE` is used only by the daily run.

Two projects means testing never uses up the daily run's free limit. Each key allows about one full episode a day.

Add both keys in your fork: Settings, then Secrets and variables, then Actions, then New repository secret. Never put a key in a file.

Gemini's free tier is not offered in the EU, the UK or Switzerland. Google may use what free-tier requests contain to improve its models.

## 5. Turn on the feed
Settings, then Pages: deploy from the `gh-pages` branch. Your feed will be at `https://<your-user>.github.io/<repo>/feed.xml`. In Apple Podcasts, go to Library, then Follow a Show by URL. Pocket Casts and Overcast can also add a feed by URL. The feed asks podcast directories not to list it.

## 6. Pick your time
The daily run is the `cron` in `.github/workflows/episode.yml`, in UTC. A run takes about ten minutes. Keep the backup run 15 minutes after the first. Use odd minutes; GitHub starts runs set on the hour late.

## 7. Rehearse, then go live
1. In Actions, run the rehearse workflow. It writes a script from today's real data with the rehearsal key and commits it to `rehearsals/`. Read it.
2. In Actions, run the episode workflow with mode `test`. It makes the full MP3 without publishing it; download it from the run.
3. When you like it, leave the schedule on. The first scheduled run publishes your first episode.

If a day fails, the run's summary page asks the listener to tell you, with a pre-filled note.

## Good to know
- Your fork is public, so what you follow is visible in `profile.json`. Episodes are public files with an unlisted address.
- The scores come from ESPN, Cricbuzz, Sofascore and Jolpica, and the news from desks' RSS feeds and Google News. These are fine for a personal show, but their terms rule out selling one.
- GitHub turns off schedules in a public repo after 60 days without a commit. Each published episode commits to the repo, so a running show stays on.
