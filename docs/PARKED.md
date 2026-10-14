# Parked: Sports for everyone (Parth, 15 Oct 2026)

To pick up after the podcast is done. Nothing is built for it yet.

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
