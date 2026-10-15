# Parked: Sports for everyone (Parth, 15 Oct 2026)

**Status: parked again on 15 Oct (Parth).** To pick up after the podcast is done. Nothing is built for it yet. **The full plan is `docs/SPORTS-FOR-EVERYONE.md`** (15 Oct: data, screens, sign-in, hosting, the podcast for friends, costs, steps and decisions), with the research in `research/free-tiers-2026-10.md`. The review of /sport below is the input for its screens.

## What Parth asked
Look at The House of 1400's sport app (https://house14.vercel.app/sport) and answer two things:
1. What can be made better without clutter?
2. Can it become a separate project where people sign in (Google, or email and a one-time code) and choose their own page: which teams, players and sports they follow? Like the podcast, it should be run by code, not by an AI, with the data sources decided up front.

Also consider: integrating it with the podcast, using one as the starting point for the other. Either the podcast becomes the start of the web app, or the web app's settings become the start of the podcast.

Constraint: keep it free.

## Notes so far (for the discussion, not decisions)
- **One profile and one data engine already exist for the podcast.** `profile.json` holds the follows, care levels, rivals, aliases and length. `engine/fetch/*` has the ESPN, Cricbuzz and Jolpica fetchers, the moods and the news. A web app would read the same profile and the same fetchers, so the two products share one core. The setup page planned for friends (podcast Phase 3) is already half of the web app's settings page.
- **The sport app in house-of-1400 is tied to Parth's follows** (config `follows`, `api/live/*`). Making it general means the same move the podcast made: ids and names from a profile, not from config.
- **To check when we pick it up:** the free sign-in options (for example Supabase or Firebase free tiers, or Vercel with an email one-time code), and where each person's profile is stored. Live data is fetched per team, not per person, so it can be shared and cached.

## Added 15 Oct (night)
- **Country decides what matters in "everything else".** Chess, for example, matters to a listener when it matters to their country. Someone in Canada making their own show could tick chess for Canada or for the world. For Parth it is a no. The podcast already has the start of this: `profile.listener.country` (a story naming the country counts a little more), `profile.wider.skip_sports` (never these sports) and `profile.wider.sports_wanted` (bring in a sport's own desks). The setup page and the web app would show these as simple choices per sport: "world", "my country only" or "never".

## Picked up 15 Oct (night): review of house14.vercel.app/sport
Looked at every tab at phone size (390 px) and at the code: `public/sport/` (vanilla JS, no build, about 1,300 lines), feeds from the paper's `/api/live/*` and `lib/sportapp.js`.

### What already works
- Today is strong: just finished, up next with a countdown, latest results, tournaments and tables. Live scores and saved copies with their time.
- The design is calm and consistent: one card style, aligned score columns, crests and flags, dark mode, installable as an app, a match sheet on tap, add to calendar.
- Every number comes from code and named sources, with no AI anywhere. This is exactly the "run by code" model.

### Better without clutter (nothing added, mostly taken away or reordered)
1. **Up next is ordered by time, not by what Parth cares about.** Tonight a Warriors pre-season game leads, above India's series decider and Madrid. Order by the podcast's care levels (die-hard first), with time as the tie-break.
2. **The betting line shows even when it says nothing.** The Warriors pre-season game shows 51% to 49%. F1 shows Hamilton, Russell and Norris at 8% each, which looks broken. Show the market only when one side is clearly favoured or the market is deep enough.
3. **Latest results reach back too far and too wide.** Djokovic's loss of 9 Oct and England 3-0 Czechia of 7 Oct are still on Today. Keep Today to the last two days and to die-hard or follow subjects. Older results live in each sport's tab.
4. **The Madrid tab is 4,300 px long** (about 5 phone screens). It has next match, form, last 5 meetings, the line-up pitch, results, fixtures, table, leaders, and four national teams. The national teams are not Madrid; give them their own place or fold them into "More". Fold leaders and past meetings behind "More".
5. **The India tab lists 12 future New Zealand matches one by one.** A series not yet started can be one line: "India tour of New Zealand, 22 Oct to 27 Nov: 5 T20Is, 5 ODIs, 2 Tests. First: 22 Oct, 12:30, Christchurch". It opens on tap.
6. **F1 has three history blocks**: circuit winners, wins by driver and winners by year. Keep one, "Max at this circuit", and fold the rest behind "More".
7. **One small consistency fix:** Today's tournament card says "ODIs India won 2-1 · T20Is Level 2-2", while the India tab says "India won 2-1" and "Level 2-2" separately. Use one wording.

### Separating it: "Sports for everyone"
**Recommendation: start from the podcast's engine, not the web app's.** The podcast engine is already general:
- a profile (any team, player or sport, with care levels, rivals, aliases, skip words and country)
- keyless sources with a backup for every score
- a curated news catalogue with paywall flags
- squads and rankings fetched every run

The web app is tied to Parth's follows in `config/house.json`. So the order is:
1. One shared core ("sports core"): the profile schema, the fetchers with backups, the moods, and the news. Both products read it. The podcast is audio over it; the web app is a page over it.
2. Port the sport app's screens (its design is the best part) to read a profile instead of house.json.
3. Add accounts and per-person settings.
4. The podcast's setup page and the web app's settings page become the same page.

**A free stack (to verify when we start; these change):**

| Need | Option A | Option B |
|---|---|---|
| Sign-in (Google, and email with a one-time code) | Supabase free: Google and email codes built in, plus a database for profiles; free projects pause after a week with no use, which a daily job prevents | Firebase free (Spark): Google and email links (a link, not a code), plus Firestore |
| Pages | GitHub Pages (static) | Cloudflare Pages |
| Shared data API with caching (one fetch per team, not per person) | Cloudflare Workers free tier | Vercel Hobby (free, but its terms are for non-commercial use only, which matters if this is ever paid) |

**Keeping it free:** data is fetched per team, not per person, and cached, so a thousand Madrid fans cost one Madrid fetch. No AI in the web app at all. The podcast stays the part that needs each person's own Gemini key, or a paid tier later.

### Decisions for Parth
1. Starting point: the podcast's engine as the shared core (recommended), or the sport app first?
2. Which of the seven "without clutter" changes to make in the House of 1400's own /sport now? That needs his go-ahead, because it changes the live paper's repo.
3. Sign-in: Supabase (email codes, recommended) or Firebase (email links)?
4. Where it lives: a new repo (`sports-for-everyone`), or folders inside this podcast repo until it is real?
