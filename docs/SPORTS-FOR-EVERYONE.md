# Sports for everyone: the plan (draft for Parth, 15 Oct 2026)

Status: parked, plan only. Nothing is built and nothing below is decided until Parth says so. The research behind it, with sources and a confidence label on every number, is `research/free-tiers-2026-10.md`. The review of the House of 1400's /sport is in `docs/PARKED.md`.

## 1. What it is
Anyone signs in, says what they follow and how much they care, and gets two things:
1. **A sport page of their own.** Today first: what just finished, what is on next (with a countdown in their time zone), where each series or championship stands, and the stories about their teams, one line each. It takes the side of the person reading it, the way the podcast does.
2. **Optionally, their own daily podcast**, as a private feed in their podcast app (the same show Parth has, with their teams).

It is run by code, not by an AI. The page has no AI at all. The podcast uses Gemini only to write and voice the conversation, from facts code gathered.

## 2. Who it is for, in order
1. **Parth** (the first user; his profile already exists).
2. **Five to twenty friends**, free, by invitation.
3. **Later, maybe, anyone, maybe paid.** Not possible at zero cost: see section 10.

## 3. The one idea that keeps it free: fetch per team, never per person
A thousand Madrid fans cost one Madrid fetch. Every source is called once per team, player or competition, the result is cached, and every person's page is put together from those shared pieces. People only add a list of what they follow; they never add load on the data sources.

## 4. How it is built
### The shared core (from the podcast, not from the paper)
The podcast's engine is already general: the profile (any team, player or sport, care levels, a rival, aliases, skip words, country), the fetchers with a backup for every score, the moods, news with clustering and folding, squads and rankings, and now "where things stand" and the ids finder. Both products read the same core:
- the podcast is audio over it
- the page is a screen over it
- the podcast's setup and the page's settings are the same screen

### The parts
| Part | What it does | Where it runs (free) |
|---|---|---|
| Subject catalogue | "Arsenal" to its ids, the way `scripts/find-ids.mjs` does now, cached | Cloudflare Worker |
| Live proxy | Passes ESPN, Cricbuzz and Jolpica responses to the browser with a short cache (30 to 60 seconds while a match is live, an hour otherwise). The browser shapes the data, so the Worker stays under its CPU limit. | Cloudflare Worker |
| Daily builder | Once a day (and again after big match windows), for every subject anyone follows: results with their story, fixtures, where things stand, news clusters. Writes one small JSON file per subject. | GitHub Actions |
| Accounts and profiles | Users, what they follow, care, rival, settings, feed token | Cloudflare D1 (database) |
| The page | A static installable app (PWA) that reads the person's profile and the subject files | Cloudflare Pages |
| Podcasts | The current episode pipeline, run per person | GitHub Actions (see section 7) |

Why Cloudflare and not Vercel: Vercel's free plan forbids any commercial use and allows one cron a day; Cloudflare's free plan has no such clause, has a database, and keeps this well away from the House of 1400, which lives on Vercel.

## 5. The page: data presentation and UI/UX
Built from what works in the paper's /sport (calm cards, aligned score columns, crests and flags, dark mode, installable, a match sheet on tap), without the clutter found in the review.

### Screens
1. **Today** (opens here)
   - **Just finished**: the last 36 hours, die-hard first, then follow. Each result says what it felt like in one line from the code's moods ("came from 3-1 down", "lost a lead late"). Older results live on the team's page.
   - **Up next**: ordered by care, then time. A countdown for anything within a day; local time always.
   - **Where things stand**: one line per subject. For example, "T20I series 2-2, decider Saturday" or "Max 4th, 119 behind". This uses the same code as the podcast.
   - **Stories**: at most two per subject, each folded to one line with the number of outlets. Tap to read the source.
   - **Rival watch**: only when the rival drops points. Never their wins, never their injuries (the same rule as the podcast, and a setting).
2. **A team or player's page**
   - **Top:** the next match, the last result with its story, and the table, series or championship snippet.
   - **Folded:** fixtures, past meetings and history, under "More". A series that has not started is one line ("India tour of New Zealand, 22 Oct to 27 Nov: 5 T20Is, 5 ODIs, 2 Tests") that opens on tap.
3. **Follow**: search, add, care level, rival, remove.
4. **Podcast**: on or off, time, length, tone, the feed link with a one-tap "Add to Apple Podcasts", and how to add it elsewhere.
5. **Settings**: time zone (detected), language, sports never wanted, sign out, delete my account.

### Rules for what is shown
- **Live fields:** never a wrong or empty one. Primary source, then backup, then the last good value with its "as of" time; otherwise hidden. This is the paper's rule.
- **Nothing about absence.** A section with nothing in it is not shown.
- **Betting lines:** shown only when one side is clearly favoured. No 51% to 49%, no 8% each.
- **Length:** each screen fits about two phone screens. Everything else is behind "More".
- **Wording:** one wording for each thing everywhere ("Level 2-2", not two versions).

### Onboarding (under two minutes)
Sign in with Google, type a team or player, pick from the results (crest, league, country), then choose care with three chips (Die-hard, Follow, Big moments). Next is an optional rival. Then "Done": the Today page is already full.

A starter pack per country speeds this up. For India: the men's cricket team and the main IPL sides.

### Accessibility and phones
- Built for 390 px first.
- Tap targets of at least 44 px.
- Contrast checked in both themes.
- Reduced motion respected.
- Works on a slow connection: the day's files are small and cached for offline use.

## 6. Sign-in
**Recommended start: Google sign-in only.** It is free with no limits that matter. It uses Better Auth on the Worker and D1, so there is no outside account service and no card.

Email with a one-time code needs an email sender, and every free sender needs a domain:

| Option | Cost | Notes |
|---|---|---|
| **A subdomain of the domain Parth already owns**, with Resend (100 emails a day free) | Zero extra | DNS records go on a new subdomain only (for example `mail.` and `sports.`), so the paper's own records are not touched. Parth adds them himself at Spaceship. |
| Firebase email link | Zero | 5 emails a day: enough to test, not to grow |
| Gmail with an app password | Zero | About 500 a day, but sent from a personal Gmail address. Fine for friends, not beyond. |

Supabase's built-in email reaches only the project's own team, and Clerk needs a domain too, so neither removes the domain step.

## 7. The podcast for friends
The limit is Gemini's free tier, not the code. One project allows about 20 text requests and about 10 voice requests a day (reported figures; Google no longer publishes them, and Parth's rehearsal key ran out of voice requests at about that point). An episode takes 1 to 4 text requests and 2 to 6 voice requests, so **one free key makes one or two episodes a day.** Three ways to get there:

| Option | How | For | Against |
|---|---|---|---|
| **A. Their own copy** (works today) | The friend forks the repo and follows `docs/MAKE-YOUR-OWN.md`, with their own two keys | No shared credentials; it is exactly Parth's show; free | Needs a friend comfortable with GitHub |
| **B. Their own key, our pipeline** | They paste a Gemini key in Settings; it is stored encrypted and used only for their episode | No GitHub needed; same voices as Parth's | Google's terms tell key owners not to let other apps use their keys (a grey area, common in practice); we hold secrets |
| **C. One key, free voices** | One key writes everyone's script with Gemini Flash-Lite (about 500 a day); an open voice model (Kokoro, free for any use) reads it on the Actions runner | No keys from friends; scales to dozens | The voices are noticeably below Gemini's; Parth said no Kokoro for his own show |

**Recommended:**
- **A** now, for friends who can manage GitHub.
- **B** later, inside the app, once the page is in use.
- **C** only if B's grey area worries Parth.

In every case:
- **No free Gemini in the EU, UK or Switzerland.** Friends there can have the page but not the podcast.
- **18 and over only.**
- **Nothing about a person is sent to Gemini.** No name, email or id goes in a prompt, only public sports facts and their follows.

## 8. Privacy and safety
- No user data in any repo. The repo can stay public because it holds code only; follows and emails live in D1.
- Feeds sit at an unguessable address and carry `itunes:block`, so podcast directories never list them.
- "Delete my account" removes everything, including the feed and its episodes.
- A one-page privacy note: what is stored, why, how to delete it.
- Rival rules are the same for everyone: never a rival's win as news, never their injuries or anything personal.
- Nothing about Parth's family anywhere, as now.

## 9. What it costs, and where free runs out
| Free limit | Enough for | Hits it first |
|---|---|---|
| Cloudflare Workers: 100,000 requests a day, 10 ms CPU each | About 1,000 people opening the app ten times a day | Parsing big JSON in the Worker (so the browser parses) |
| D1: 5 GB, 100,000 row writes a day | Profiles for many thousands | Never at friends scale |
| GitHub Actions: unlimited in a public repo, 2,000 minutes a month in a private one | Daily builder (about 5 minutes) plus a podcast (about 10 minutes) per person: about 6 people on private, more on public | Podcasts per person |
| Gemini free: about 20 text and 10 voice requests a day per project | One or two episodes per key | Podcasts without friends' own keys |
| GitHub Releases for MP3s | Friends scale (about 5 MB an episode, 7 days kept) | GitHub may throttle heavy use |

Grey areas accepted knowingly at friends scale (each is fine at this size, and each blocks a paid product):
- the unofficial score sources' terms (ESPN, Cricbuzz, Sofascore)
- Google News RSS (personal reading only)
- GitHub Actions and Releases as a content factory
- shared Gemini keys (option B)

## 10. Before anyone pays
Zero spend and paying users do not fit together, mainly because of data:
1. **Licensed data.** ESPN, Sofascore, Cricbuzz, Google News RSS, Jolpica and OpenF1 all rule out commercial use. Paid feeds replace them (football-data.org or API-Football, a cricket API, a news API).
2. **Paid Gemini.** Needed for EU and UK users, and so users' content is not used for training.
3. **Proper hosting** for the MP3s, plus email from the domain.
4. **A privacy policy and terms**, and an 18+ gate.

This is a separate decision, with a cost, for later.

## 11. Steps, in order (each one shown to Parth before the next)
0. **Decisions** (section 12).
1. **Core**: move the podcast's engine into a `core/` folder that both products import. No behaviour change; the podcast's tests and a rehearsal prove it.
2. **Subject files**: the daily builder writes one JSON file per subject Parth follows. Checked against his paper.
3. **The page, for Parth only**: Today and one team page, reading his profile, no sign-in. Compared side by side with /sport at 390 px. This is the step where the design is agreed.
4. **Follow screen and catalogue**: search by name (the ids finder as a Worker), care chips, rival.
5. **Accounts**: Google sign-in, profiles in D1, onboarding, delete account.
6. **Friends beta**: five friends. Each gets a short note on what to try. Their verdicts become rules, the way Parth's did.
7. **Podcast in the app** (option B or C), after the beta.
8. **Later**: email codes (after the domain step), notifications (web push is free), starter packs for more countries, more sports.

## 12. Decisions for Parth
1. **Starting point**: the podcast's engine as the shared core (recommended), or the paper's sport app first?
2. **Where it lives**: a new repo `sports-for-everyone` (recommended; private is fine, its minutes are enough), or folders in this podcast repo until it is real?
3. **Address**: a free `*.pages.dev` address (recommended to start), or `sports.` on your own domain (a DNS record you add at Spaceship; the paper is not touched)?
4. **Sign-in**: Google only to start (recommended), or email codes from day one (needs the domain step)?
5. **Podcast for friends**: A now, B later (recommended), or C?
6. **The paper's /sport**: should any of the seven fixes from the review go into the House of 1400 itself? That changes the live paper, so only on your word.
7. **Name**: the app needs one. I can draft a prompt for ChatGPT, the way we did for the show.
