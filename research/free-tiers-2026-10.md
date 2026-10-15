# "Sports for everyone": free-tier and terms research

Researched 15 Oct 2026. Every number below was checked against the source linked next to it. The "last updated" or effective date is given wherever the page shows one.

**Confidence labels**
- **[V]**: verified on the official page.
- **[S]**: secondary source only, or the official page is ambiguous.
- **[NV]**: could not verify.

This is not legal advice.

Note added after checking (Claude, 15 Oct): the 404 from Sofascore in section 7 was `events/next/0` for a player with no match scheduled, which is Sofascore's normal answer. Its search and past events answered from this server the same morning, so it is not blocking us. It remains a backup source only.

---

## 1. Hosting

| Option | Free limits that matter | Card? | Commercial / paid users on free? |
|---|---|---|---|
| **Vercel Hobby** | Per month: 1M function invocations, 4 hrs Active CPU, 360 GB-hrs memory, 100 GB Fast Data Transfer, 1M CDN requests. 100 deployments/day. Function max 300 s. Runtime logs kept 1 hour. If you exceed a limit you usually wait 30 days. **Cron: max once per day, fires within ±59 min** of the set time; more frequent expressions fail at deploy. [V] | No | **No.** Hobby is "restricted to non-commercial personal use only". Commercial use means financial gain for *anyone* involved: taking payments, ads, or paid hosting/creation. Asking for donations is allowed. [V] |
| **Cloudflare Workers Free** | 100,000 requests/day (resets 00:00 UTC; over that, Error 1027). **10 ms CPU per invocation, cron included.** 50 external subrequests per invocation. 5 Cron Triggers per account. Cron wall time up to 15 min. 128 MB memory. [V] | No for Workers | No non-commercial clause found in Cloudflare's service-specific terms [S: absence of a clause, not an explicit grant]. The CDN terms let Cloudflare limit accounts that serve "a disproportionate percentage of... audio files" through the CDN unless they use Paid Services such as the Developer Platform, Images or Stream [V]. That matters for hosting MP3s; see section 6. |
| **Cloudflare Pages Free** | 500 builds/month, 1 concurrent build, 20,000 files, 25 MiB per file, 100 projects. Static requests are free and unlimited. Pages Functions count against the Workers quota. [V] | No | Same as Workers. |
| **Netlify Free** | Credit-based (accounts created since Sep 2025): 300 credits/month, hard cap. Bandwidth costs 20 credits/GB (so about 15 GB alone uses everything). Compute costs 10 credits/GB-hr, each production deploy 15 credits, web requests 2 credits per 10k. **When credits run out, every project is paused ("Site not available") until the cycle resets.** [V] | Not stated [NV] | The Terms of Use have no non-commercial clause; plan rules sit in the Self-Serve Subscription Agreement, which I did not read [NV]. |
| **GitHub Pages** | 1 GB site, soft 100 GB/month bandwidth, soft 10 builds/hour (not applied to Actions-based deploys). Pages on a private repo needs a paid plan, so on free the repo and the MP3s are public. [V] | No | **No for SaaS.** Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business", or for sites "primarily directed at... commercial transactions or providing commercial software as a service (SaaS)". Donation buttons are OK. [V] |
| **Firebase Hosting (Spark)** | 10 GB storage and **360 MB/day transfer** (very small for audio). **Cloud Functions and Cloud Storage are not available on Spark.** [V] | No ("No payment method needed") [V] | Allowed (no non-commercial clause on Spark) [S]. |

Sources:
- https://vercel.com/docs/plans/hobby (updated 2026-09-14)
- https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage (2026-09-14)
- https://vercel.com/docs/cron-jobs/usage-and-pricing (2026-07-15)
- https://developers.cloudflare.com/workers/platform/limits/ (12 Oct 2026)
- https://developers.cloudflare.com/workers/platform/pricing/ (2 Oct 2026)
- https://developers.cloudflare.com/pages/platform/limits/ (5 Sep 2026)
- https://www.cloudflare.com/service-specific-terms-application-services/ (28 Sep 2026)
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ (1 Sep 2026)
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ (12 Aug 2026)
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features (27 Aug 2026)
- https://firebase.google.com/pricing

---

## 2. Login

| Option | Free limits | Card? | Commercial? | Catch |
|---|---|---|---|---|
| **Supabase Auth (Free)** | 50,000 MAU, 2 active projects, **project pauses after 7 days of inactivity**. [V on the pricing page; what counts as "activity" is not documented, NV] | Third parties say no card [S] | No restriction found [S] | **The built-in email service only delivers to your own org's team members, at 2 emails/hour.** Email OTP or magic links for friends therefore need custom SMTP. Google OAuth is supported. [V] |
| **Firebase Auth (Spark)** | Google sign-in works. Daily limits with Identity Platform: 3,000 daily active users ("Tier 1"). **Email link sign-in: 5 emails per day**; more needs a billing account. Verification emails 1,000/day, password resets 150/day. **SMS is not available on Spark.** [V] | No | Yes [S] | 5 email links a day is enough for a handful of friends signing in once. It is not enough for growth. |
| **Clerk Hobby** | 50,000 monthly retained users per app, up to 3 social connections (Google included), email codes and email links included, no SMS. 3 dashboard seats, sessions fixed at 7 days. [V] | "No credit card required" [V] | Not addressed [NV] | **A production instance needs a domain you own** (DNS records) [V], and a domain costs money, which breaks the zero-spend rule. |
| **Auth.js / Better Auth on Cloudflare Workers + D1** | Free (open source). Better Auth has Email OTP and Magic Link plugins and runs on D1 via Drizzle or Kysely [S]. | No | Yes (your own code) | You still need an email sender (below). The 10 ms CPU limit is fine for OTP and session checks. Avoid heavy password hashing. |

**Email senders**

| Provider | Free | Card? | Catch |
|---|---|---|---|
| **Resend** | 3,000/month, **100/day**, up to 3 domains [V] | Not stated on the pricing page; directories conflict [NV] | **You must verify your own domain to send to anyone but yourself.** The sandbox sender (onboarding@resend.dev) gets a 403 for other recipients. [V, Resend KB] |
| **Brevo** | 300/day; transactional API and SMTP included [S, pricing page did not render] | "No card" per third parties [S] | Free-mail senders such as gmail.com cannot be authenticated. Without your own domain, mail goes out from brevosend.com and Microsoft inboxes may spam or reject it. [S] |
| **Cloudflare Email Service** | **Workers Free cannot send to arbitrary recipients.** Outbound sending needs Workers Paid (3,000/month included, then $0.35 per 1,000). Free covers only sends to *verified destination addresses in your own account*, plus inbound Email Routing. [V] | Paid plan needs a card | Not usable for OTP on free. |
| **Gmail SMTP with an app password** (as custom SMTP for Supabase, or from your own code) | About 500 recipients/day for a personal account [S] | No | Works without a domain. Gmail's consumer terms are not meant for a business's transactional mail, so use it for friends only. |

**Google OAuth itself** is free. An app that asks only for non-sensitive scopes (openid/email/profile) does not need app verification [V: support.google.com/cloud/answer/13463073]. Without brand verification the consent screen shows your app's domain [V]. The 100-test-user cap for apps left in "Testing" status is from memory [NV]: publish the app to "In production" to avoid it.

Sources:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/auth-smtp
- https://firebase.google.com/docs/auth/limits (2026-10-14)
- https://clerk.com/pricing
- https://clerk.com/docs/guides/development/deployment/production
- https://resend.com/pricing
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- https://developers.cloudflare.com/email-service/platform/pricing/ (9 Jun 2026)

---

## 3. Database and storage

| Option | Free limits | Card? | Catch |
|---|---|---|---|
| **Supabase Postgres** | 500 MB database (shared CPU, 500 MB RAM), 1 GB file storage, 5 GB egress plus 5 GB cached egress, 500k Edge Function invocations, 2 projects. **Pauses after 7 days of inactivity.** [V] | No [S] | A daily cron or ping counts as activity in practice [S]. |
| **Cloudflare D1** | 10 databases, 500 MB each, 5 GB total; 5M rows read/day, 100k rows written/day; 50 queries per Worker invocation. [V] | No | Plenty for user profiles and preferences. |
| **Cloudflare KV** | 100k reads/day, **1,000 writes/day**, 1,000 deletes/day, 1 GB stored. [V] | No | The 1k writes/day is tight for caching data per user. Cache per team or competition instead. |
| **Cloudflare R2** | 10 GB-month storage, 1M Class A and 10M Class B ops per month, **egress free**. [V] | **Likely yes:** activating R2 asks for a card or PayPal even for the free tier [S, several third-party guides]. That fails the no-card rule. | The r2.dev public URL is rate-limited and "intended for non-production traffic"; production wants a custom domain on Cloudflare. [V] |
| **Firestore (Spark)** | 1 GiB stored, 50k reads/day, 20k writes/day, 20k deletes/day, 10 GiB/month egress. [V] | No | No Cloud Functions on Spark, so server logic has to live elsewhere. |
| **Turso Free** | 100 databases, 5 GB storage, 500M rows read and 10M rows written per month. "Start free, no credit card required." [V] | No [V] | A good alternative to D1 if you are not on Cloudflare. |

Sources:
- https://developers.cloudflare.com/d1/platform/limits/ (21 Apr 2026)
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/ (1 Oct 2026)
- https://developers.cloudflare.com/r2/buckets/public-buckets/ (25 Sep 2026)
- https://firebase.google.com/pricing
- https://turso.tech/pricing

---

## 4. Scheduled jobs

| Option | Free | Catch |
|---|---|---|
| **GitHub Actions** | **Public repos: standard runners free and unlimited**, on 4 vCPU / 16 GB RAM Linux runners. **Private repos: 2,000 min/month** on 2 vCPU / 8 GB runners, and usage stops at the quota when no payment method is on file. [V] Max job length is 6 hours [from memory, NV]. | Scheduled runs "can be delayed during periods of high loads". The minimum interval is 5 minutes. **In public repos, schedules auto-disable after 60 days with no repo activity.** [V] **Terms:** do not use Actions "as part of a serverless application", or on hosted runners for "any other activity unrelated to the production, testing, deployment, or publication of the software project" [V, Additional Product Terms, 27 Aug 2026]. A daily job that builds content for a site in the same repo is arguably "publication" (the House of 1400 pattern). A multi-user podcast factory serving other people is a grey area, and the risk grows with paid users. |
| **Cloudflare Cron Triggers** | 5 per account, cron syntax down to every minute. [V] | **10 ms CPU per invocation on free.** Waiting on fetch does not count, but parsing large ESPN or Sofascore JSON, building an RSS feed or anything audio-related will hit it. 50 subrequests per invocation. Cron wall time up to 15 min. [V] Fine as a trigger and for light fetch-and-store; too small for TTS or MP3 work. |
| **Vercel Hobby cron** | Once per day, ±59 min. [V] | Non-commercial only. |
| **Supabase Cron (pg_cron) + Edge Functions** | Cron can run "every second" and call HTTP or Edge Functions. Plan availability is not stated on the Cron page [NV], but pg_cron is a standard extension. Edge Functions on Free: 500k invocations/month, **2 s CPU per request**, 150 s wall clock, 256 MB, 100 functions. [V] | Outbound ports 25 and 587 are blocked (so no direct SMTP; use an HTTP email API). 2 s CPU is better than Cloudflare's 10 ms but still too small for TTS encoding. |

Sources:
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features
- https://developers.cloudflare.com/workers/platform/limits/
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/functions/limits

---

## 5. Gemini API free tier (as of Oct 2026)

**Which models are free.** The pricing page (updated 2026-10-14) shows "Free of charge" input and output for these, among others: Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 2.5 Flash, 2.5 Flash-Lite, 2.5 Pro, **Gemini 3.8 Flash TTS, 3.8 Flash-Lite TTS, 3.1 Flash TTS Preview and 2.5 Flash Preview TTS**. These have no free tier: Gemini 4 Argon, 3.1 Pro Preview and 2.5 Pro Preview TTS. [V]

**Rate limits.** Google no longer publishes free-tier RPM or RPD tables. The rate-limits page (updated 2026-10-13) says free-tier limits "can be viewed in Google AI Studio" (aistudio.google.com/rate-limit) for your own project. [V] Reported figures:
- **Text:** about **20 RPD** for the 3.x Flash models and **500 RPD** for 3.5/3.1 Flash-Lite, as of Sep 2026 [S: scriptbyai.com]. Other blogs still quote 250 to 1,500 RPD, which predates the cuts [S, likely stale].
- **TTS:** a forum report has the free quota for gemini-3.1-flash-tts at **10 requests/day** (8 Aug 2026) [S]. Paid Tier 1 for the 3.8 TTS models is reportedly capped at **100 RPD** (Oct 2026), and Google staff acknowledged Tier 2 projects stuck at that figure [S, discuss.ai.google.dev]. **I could not verify a free RPD for 3.8 Flash TTS.** Plan for single-digit to low-double-digit TTS calls per day per project on free.

**What TTS does.** Multi-speaker audio supports **up to 2 speakers per request**, with prebuilt voices only, which matches a two-host format. Output is 24 kHz mono 16-bit WAV/PCM, so you still have to encode MP3 yourself (ffmpeg). [V: speech-generation doc, 2026-10-12]

**Training and data use.** On the free tier, "Used to improve our products" = **Yes**, and "human reviewers may read, annotate, and process your API input and output". Paid tier = No. [V] Prompts here contain only public sports data plus users' team choices, so the risk is low; still, keep user emails and IDs out of prompts.

**Apps serving users, regions and age**
- "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom." [V, Gemini API Additional Terms, effective 23 Mar 2026] So **the free tier cannot power the podcast for friends in the EU, UK or Switzerland.** India, US and other listed countries are fine.
- Users must be 18 or older. Apps must not be "directed at, or likely accessed by, people under 18". [V]
- The terms do not ban production or commercial apps on the free tier [V, no such clause found]. Quotas are the practical limit.

**BYOK (each user brings their own key)**
- Legally, Google's API terms say credentials "are intended to be used by you and identify your API Client" and you must make "reasonable efforts to prevent and discourage other API Clients from using your credentials". [V, Google APIs Terms, last modified 9 Nov 2021] A user *giving* their key to your app is therefore something Google tells *them* not to do. It is a grey area, and common in practice.
- Each key's owner is the developer under Google's terms (18+; the EEA/UK rule bites if they are there). Their free-tier data is used for training.
- Practically it multiplies quota (each user's project has its own free quota) and moves cost risk to them. You must store keys encrypted, and users must create a key in AI Studio.
- Cleaner variant: for technical friends, offer a "run it yourself" GitHub template. Each friend forks it and runs it in their own Actions with their own key, so nobody shares credentials.

**Other free TTS (no card)**

| Option | Licence / terms | Notes |
|---|---|---|
| **Kokoro-82M** | **Apache-2.0** weights; commercial use OK. v1.0: 8 languages, 54 voices. [V] | Runs on CPU, so it fits a GitHub Actions public-repo runner (4 vCPU). No CPU benchmark is published [NV]. Not natively multi-speaker: render each host's lines with a different voice and concatenate. The best free and safe option. |
| **Piper** | The original rhasspy/piper (MIT) was **archived 6 Oct 2025**. Development moved to OHF-Voice/piper1-gpl (**GPL-3.0**). Each voice has its own licence. [S] | Fast, lower quality than Kokoro. GPL only matters if you distribute the binary; running it server-side is fine. |
| **Cloudflare Workers AI** | Free: **10,000 neurons/day**. MeloTTS costs 18.63 neurons per audio minute, so about 500 min/day free. Deepgram Aura-2 costs 2,727 neurons per 1k characters, so only about 3.6k characters/day free. [V, 9 Oct 2026] | MeloTTS is free and generous but lower quality. Aura sounds better but the free amount is tiny. |
| **edge-tts** (unofficial Microsoft Edge Read Aloud endpoint) | **No licence.** It is an undocumented Microsoft service. A Microsoft Q&A community answer gave no permission. Third-party projects report Microsoft blocking non-Edge clients (Dec 2025). [S] | Avoid: unlicensed and fragile, and not acceptable once you take money. |

Sources:
- https://ai.google.dev/gemini-api/docs/pricing (2026-10-14)
- https://ai.google.dev/gemini-api/docs/rate-limits (2026-10-13)
- https://ai.google.dev/gemini-api/terms (effective 23 Mar 2026, updated 2026-04-28)
- https://ai.google.dev/gemini-api/docs/available-regions (2026-04-28)
- https://ai.google.dev/gemini-api/docs/speech-generation (2026-10-12)
- https://developers.google.com/terms
- https://www.scriptbyai.com/gemini-api-free-tier-limits/
- https://discuss.ai.google.dev/t/gemini-lies-about-free-tier-quota-limits-sudden-resource-exhausted-blockers-on-tts-models/177531
- https://discuss.ai.google.dev/t/will-tier-2-increase-the-effective-daily-quota-for-gemini-3-8-tts/187071
- https://huggingface.co/hexgrad/Kokoro-82M
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://learn.microsoft.com/en-us/answers/questions/2392491/unofficial-edge-tts-api

---

## 6. Podcast delivery

**Private per-user RSS feeds are well supported.** Use an unguessable token in the URL plus `<itunes:block>yes</itunes:block>`.

- **Apple Podcasts:** "Follow a Show by URL" is in the Library menu on iPhone and iPad and under File on Mac. Such shows are followed "directly from the hosting provider, not the Apple Podcasts catalog". They are excluded from Search, recommendations and charts. For private feeds Apple says "be sure to use the `<itunes:block>` tag". Auto-download and notifications still work. [V: podcasters.apple.com/support/5108, support.apple.com Mac Podcasts guide]
- **Overcast:** treats a feed as private if the URL contains HTTP Basic Auth or the feed has `<itunes:block>`. Private feeds are excluded from search and recommendations, get no Share button, and their web pages are visible only to users who entered the exact URL. [V: overcast.fm/podcasterinfo] Overcast crawls feeds server-side, so a token URL does pass through its servers [S].
- **Pocket Casts:** submit the feed via its form with **Private** selected. You get a short URL to paste into in-app search, and the feed does not appear in search for others. Feeds carrying itunes:block are kept out of public search. [V for the form flow; S for itunes:block] Pocket Casts fetches feeds from its servers, so a feed on a private network will not work [S].

**Free MP3 storage**

| Option | Limits / terms | Verdict |
|---|---|---|
| **GitHub Releases** | Each asset under 2 GiB, up to 1,000 assets per release, no published bandwidth cap. [V] The Acceptable Use Policy (s. 9) lets GitHub "throttle your file hosting" or suspend for bandwidth "significantly" above comparable users. [V] The repo must be public for podcast apps to fetch without auth, so episodes are effectively public, though not discoverable. | Fine at friends scale (a 10 MB episode for 20 friends is about 6 GB/month). Not a CDN you can build a business on. |
| **Cloudflare R2** | 10 GB storage, free egress. [V] Activation reportedly needs a card or PayPal [S]. Serving MP3s through a Worker binding or a custom domain fits the CDN terms ("Developer Platform" is a named exception) [V]; r2.dev is dev-only [V]. | Best technically, but **fails the no-card rule** if the card requirement holds. Prune episodes after about 7 days to stay well under 10 GB. |
| **Cloudflare Workers static assets / Pages** | 25 MiB per file, 20k files. [V] Would require a redeploy per episode (500 builds/month). | A possible hack. Heavy audio may trip the CDN "disproportionate audio" clause. |
| **Internet Archive** | Could not retrieve the current Terms of Use (JS-only page) [NV]. Uploads there are public library items under a licence you choose, expected to be permanent, and the Archive removes infringing content. [S] | **Do not use** for daily throwaway personal episodes. It is a library, not a CDN, and the episodes would be public. |
| **Firebase Hosting** | 360 MB/day transfer. [V] | Too small. |

Episode size: 24 kHz mono speech at 48 to 64 kbps MP3 is about 0.36 to 0.48 MB per minute, so a 10-minute show is about 4 to 5 MB.

---

## 7. Data sources: terms

| Source | What the terms say | (a) Free app for friends | (b) Commercial |
|---|---|---|---|
| **ESPN unofficial API** (site.api.espn.com) | ESPN falls under the Disney Terms of Use (updated 24 May 2024). They ban accessing or extracting content "using a robot, spider, script, or other automated means", "data mining or web scraping", and using the products "for any commercial or business-related use". [V] | Breaches the ToS. Enforcement against small private use is unlikely but possible (blocking). Facts like scores are not copyrightable in themselves, but the ToS is a contract. | **Not OK** without a licence. |
| **Sofascore API** (api.sofascore.com) | Main T&C page is JS-rendered and could not be read [NV]. The same company's (Sofa IT d.o.o.) Torneo terms say: platform "only for domestic and private use"; no "resale or commercial use"; "You must not use data mining, robots or similar gathering or extraction methods". [V for Torneo; S that sofascore.com is the same] **From this server, api.sofascore.com returned 404** on a standard endpoint (it blocks non-browser or datacenter clients). [V, tested today] | Breaches ToS and is technically fragile (bot protection). | **Not OK.** |
| **Cricbuzz pages** | Terms prohibit "using any automated system... 'robots,' 'spiders,' 'offline readers'" and "data mining... using spiders, crawlers, robots, indexing agents, and screen scrapers". "Personal Use Only: The Services are only for personal or internal business use." Also bars "any commercial purpose". [V, cricbuzz.com/info/termsofuse fetched today, no date shown] | Breaches ToS. | **Not OK.** |
| **Google News RSS** | The feed's own `<copyright>` element (checked today): "made available solely for the purpose of rendering Google News results within a personal feed reader for personal, non-commercial use. Any other use of the feed is expressly prohibited." [V] | Grey. An app rendering headlines for friends is not "a personal feed reader". Low risk at tiny scale. | **Not OK.** |
| **Jolpica-F1** (Ergast successor) | Terms (27 Aug 2025): "freely available for **non-commercial use**". Commercial use means contacting admin@jolpi.ca. Data is **CC BY-NC-SA 4.0**. Unauthenticated limits: 4 req/s burst, **500 req/hour**. [V] | **OK** (with attribution and share-alike). | Needs permission. |
| **OpenF1** | Free "Community" tier: historical data (2023 onward), 3 req/s, 30 req/min. Live data during sessions needs Sponsor at EUR 9.90/month. CC BY-NC-SA 4.0. Intended for "non-commercial fan engagement"; contact them for other uses. [V] | OK (historical, not live). | Needs a licence. |
| **football-data.org** | Free: 12 competitions, 10 calls/min, fixtures and tables, **delayed scores**; no lineups or scorers. [V: pricing page, no date] Commercial use on free: not found [NV]. | Good, with clear terms. | Check the terms; paid tiers exist. |
| **API-Football (api-sports.io)** | 100 requests/day, 10/min, all endpoints; "free plan covers recent seasons" (exact cutoff not found; reportedly not always the current season). [S: official pricing page blocked by bot check] | 100/day is tight but usable with caching. | Paid plans; read the terms. |
| **TheSportsDB** | Free: 30 req/min, "most queries limited"; live scores and V2 are Premium. [V partly] Data licence and commercial terms not found [NV]. | OK for logos, badges and fixtures. | Unclear. |
| **CricketData.org (CricAPI)** | "Lifetime free" plan with 100 hits/day [S, site returned 503]. | The only cricket option with a clear API path. | Paid plans from about $5.99/month [S]. |

**Bottom line on data.** For friends only, the unofficial sources are *ToS breaches with low practical risk*. The real risk is blocking (Sofascore already blocks this server). **For a commercial product, ESPN, Sofascore, Cricbuzz, Google News RSS, Jolpica and OpenF1 are all off-limits without a licence.** There is no zero-cost, clean-licence source covering football, cricket and F1 live data commercially.

Sources:
- https://disneytermsofuse.com/english/
- https://torneo.com/terms-of-service
- https://www.cricbuzz.com/info/termsofuse
- https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md
- https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md
- https://openf1.org/
- https://www.football-data.org/pricing
- https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide
- https://www.thesportsdb.com/pricing

---

## What this means for the plan

### Best zero-cost, no-card stack for friends only
1. **Web app and API:** Cloudflare Workers with static assets (or Pages) on a free `*.workers.dev` / `*.pages.dev` subdomain. No domain is needed and there is no non-commercial clause. Keep each request light because of the 10 ms CPU limit. Vercel Hobby also works while nobody pays, but its non-commercial clause is the first thing that breaks.
2. **Database:** Cloudflare D1 for users, preferences and the data cache. Avoid KV for anything written per user (1k writes/day).
3. **Login:** Google sign-in only, via Better Auth (or Auth.js) on Workers + D1, or via Supabase Auth if you prefer hosted. **Email OTP needs a domain for any real email API** (Resend, Brevo, Clerk production, Cloudflare Email). The zero-spend fallbacks are both weak:
   - Firebase email link: 5 per day.
   - Gmail SMTP with an app password: about 500 per day, from your Gmail address.

   Start Google-only.
4. **Data and podcast pipeline:** a daily GitHub Actions workflow in a **public** repo (unlimited minutes, 4 vCPU). Code fetches ESPN, Jolpica, Cricbuzz and Google News once per *team or competition*, not per user, and writes JSON to D1 or the repo. Do not depend on Sofascore; it already blocks datacenter IPs. Push a commit each run so the 60-day schedule auto-disable never triggers.
5. **Script and voice:** Gemini Flash-Lite (about 500 RPD reported) or Flash (about 20 RPD reported) writes the scripts.
   - Free Gemini TTS is roughly 10 requests per day, so it is only enough for a few friends. Make it the "premium voice" for the first handful of users.
   - **Kokoro-82M (Apache-2.0) on the Actions runner** is the default voice for everyone else: two voices for two hosts, ffmpeg to MP3.
   - Exclude EU, UK and Swiss friends from anything Gemini-generated on the free tier.
6. **Feeds and MP3s:** per-user RSS with a random token path and `<itunes:block>yes`, served by the Worker. MP3s go to GitHub Releases in the public repo (rolling, keep 7 days). Apple "Follow a Show by URL", Overcast "Add URL" and Pocket Casts "Private" submission all work. Note that the episodes are public-but-unlisted.
7. **Grey areas to accept knowingly at friends scale:**
   - unofficial data sources (ToS breaches);
   - Google News RSS ("personal feed reader" only);
   - GitHub Actions/Releases used as a content factory and file host;
   - BYOK Gemini keys (Google says not to share credentials).

### What must change before taking money
1. **Data licensing is the blocker, not hosting.** Replace ESPN, Sofascore, Cricbuzz and Google News RSS with licensed feeds, for example football-data.org or API-Football paid tiers, a licensed cricket API, OpenF1 Sponsor or a Jolpica commercial agreement, and a licensed news API or publisher RSS feeds whose terms allow it. This will cost money. "Zero spend" and "paying users" are not compatible here.
2. **Hosting:** Vercel Hobby is out (any payment counts as commercial use). GitHub Pages is out for SaaS. Cloudflare free is not barred, but get a real domain (needed for email anyway) and expect to move to Workers Paid ($5/month, card) for CPU headroom and outbound email.
3. **Gemini:** move to a paid Cloud-billed project. That is required for EU, UK and Swiss users, and it stops your users' content being used for training and human review. Paid Tier 1 TTS is itself reportedly capped at 100 RPD, so check quotas before launch. Drop BYOK, or make it explicit opt-in.
4. **MP3 hosting:** move off GitHub Releases to R2 behind a custom domain (card), or another proper object store, and use signed or tokenised URLs.
5. **Email OTP:** own a domain and use Resend or Brevo with SPF/DKIM/DMARC.
6. **Remove edge-tts** if it was ever used. Kokoro (Apache-2.0) is fine commercially. Piper is GPL-3.0 code with per-voice licences.
7. **Legal basics:** a privacy policy, plus an 18+ gate if Gemini output is user-facing (Gemini terms bar under-18 audiences).

### Not verified
- Free RPD for Gemini 3.8 Flash TTS.
- The exact free-tier numbers for Gemini text models.
- Whether Netlify Free allows commercial use.
- Whether Supabase Cron is on the free plan (very likely yes).
- The R2 card requirement (third-party sources only).
- Sofascore's main-site T&C text.
- Internet Archive terms.
- Clerk commercial terms.
- API-Football season cutoff.
- CricketData free plan (site down).
- Google OAuth 100-test-user detail.
