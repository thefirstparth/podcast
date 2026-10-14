# The show for Parth: structure, data and moods (draft 1, 15 Oct 2026)

For your review before any script or audio. The worked example is the real data pack from tonight: `rehearsals/2026-10-15/pack.md`.

## How one episode is made, before any AI

1. **Your profile** (`profile.json`): what you follow and how much you care.

   | | Care |
   |---|---|
   | Real Madrid, India men, Max Verstappen, Carlos Alcaraz | Die-hard |
   | Novak Djokovic, Golden State Warriors, F1 as a whole, men's tennis as a whole | Follow |
   | Cristiano Ronaldo | Big moments |
   | Barcelona | Rival |

2. **Code fetches the facts** for the last day:

   | Sport | Source |
   |---|---|
   | Football (results, goals with minutes, red cards, table) | ESPN |
   | India's cricket (results, scorecard, series, next match) | Cricbuzz |
   | F1 (qualifying, sprint, race, standings, next round) | Jolpica |
   | Tennis (matches of your players, big matches) | ESPN |
   | Warriors | ESPN |
   | News | the sport desks' feeds and a Google News search per name |

   These are the sources your paper already uses.

3. **Code works out what each result felt like** from the goals and the score: came from behind, threw a lead away, late winner, heavy defeat, red card, upset, knocked out, title. It then sets the mood from the table below.

4. **Code ranks everything** by care x stake x freshness, puts it in the running order, and gives each segment a word budget. A quiet day stays short. A big day is cut to your 10-minute maximum.

5. **Only then** does Gemini get the pack and write the conversation. It may use these facts and nothing else.

## The moods

| Your side | What happened | Mood |
|---|---|---|
| Your team or player | won a final or title, came from behind, won a race | elated |
| | won with a late winner or hung on late | relieved |
| | an ordinary win, a podium | happy |
| | a narrow loss, knocked out | gutted |
| | a heavy loss, threw a lead away, lost to a much weaker side, a red card in a loss, a DNF | angry |
| | a draw (relieved if they came from behind, frustrated if they threw a lead away) | frustrated |
| Barcelona | lost | gleeful |
| | drew | smug |
| | won | **never said** (it appears only under "Left out on purpose" in the pack, so you can check) |

Rules that always hold:
- Never a rival's injury, illness or anything personal.
- No laughing in a sad segment.
- The league table comes only with a league result, said right after it, rival included ("Barcelona stay top, six clear"). On any other day, the table and the rival's place in it are not mentioned (Parth, 15 Oct).

## Moods have a shape and a strength (Parth, 15 Oct: "slightly more dynamic")

- **Shape:** the goals tell where the mood turned. Roma: "1-3 down at 57', then won with goals at 83', 85', 90'", so the segment starts in dread and ends elated, not elated from the first word. A lead thrown away goes the other way.
- **Strength, 1 to 5:** how much you care, plus one for a final, knockout, derby, title or exit, plus one for drama (a comeback, a heavy result, a late winner, a run ended). Pre-season is always 1. The Fan plays it at full strength, the Anchor one lower.
- **Context:** form before the match. A win that ends a bad run is relief. A third defeat in a row is anger, not sadness. A derby against a rival is the biggest of all. A day when Madrid won and Barcelona dropped points opens with both.

## Running order (what the 15 Oct pack gives)

| # | Segment | Tonight | Mood |
|---|---|---|---|
| 1 | **Cold open**, one or two lines on your biggest moment, no "hello" first | Madrid, 3-1 down at Roma, won 4-3 with three goals from the 83rd minute | elated |
| 2 | **Your teams**, die-hards by weight | Madrid at Roma (the goals in order, the comeback, 4th in La Liga, 6 off the top, Sevilla on Monday) | elated |
| | | India lost the 4th T20I by 24 runs (WI 247/3, India 223), series 2-2, decider in Bengaluru on Saturday | gutted |
| | | Alcaraz out of Shanghai to Zizou Bergs, 7-5 7-6 | gutted |
| | | India's win in the 3rd T20I | happy, briefly (older) |
| | | Max won in Singapore from pole, 4th in the championship | elated (older, so short) |
| 3 | **Rival Watch** | Left out tonight: Barcelona won. On a night they drop points it comes here, short and gleeful | |
| 4 | **Also on your list**, brisk | Warriors beat the Lakers in pre-season. Ronaldo scored in Al Nassr's 3-1. Djokovic news. Porzingis' health | happy, light |
| 5 | **Around the grounds**: at most two results or stories from outside your list that any fan would expect to hear, scored by code; none on a quiet day | Inter 3-4 Club Brugge at San Siro. Bodo/Glimt 1-0 Dortmund. (Considered, not used: Sri Lanka beating Pakistan, Liverpool 0-3 City, Australia by 214 runs, City 2-4 PSG) | neutral, amused |
| 6 | **Coming up**, in IST | Warriors Sat 07:30. India's 5th T20I Sat 19:00, Bengaluru. Madrid v Sevilla Mon 00:30. Madrid v Leipzig Thu 00:30 | nervous and excited for the big ones |
| 7 | **Sign-off** | the same line every day | |

The real daily window is the last 30 hours. Tonight's pack uses 4 days so every sport shows up; that is why Alcaraz, the 3rd T20I and Singapore appear, at reduced weight.

## Two hosts (names and voices come after the script is approved)

- **The Fan** feels it the way you do: elated, gutted, angry, gleeful. Tells your teams' stories.
- **The Anchor** keeps the facts straight, explains the table and the series, asks "hang on, why?", and teases the Fan a little. Leads "Around the grounds" and "Coming up".

## What I need from you on this page

1. Is the running order right? Should Rival Watch come right after the cold open instead (celebration first)?
2. Are the moods right? Is a Max win "elated" for you? Is a narrow Madrid loss "gutted" and a heavy one "angry"?
3. Should Barcelona being top of the table ever be said? It is not said now.
4. Is anything in tonight's pack wrong against what really happened? My checks: the India series matches your 14 Oct paper (India led 2-1 before the 4th). The Madrid comeback from 3-1 down matches the BBC, Guardian and Al Jazeera headlines. Max's Singapore win matches Jolpica's race result and qualifying.
