import test from "node:test";
import assert from "node:assert/strict";
import { spoken } from "../engine/audio/lib.mjs";

// 17 Oct: "7:00 PM" was voiced "seven a m, P M" and "11:00 PM" as "eleven a m"
test("a time is said once, with its own am or pm", () => {
  assert.equal(spoken("Saturday evening at 7:00 PM."), "Saturday evening at seven p m.");
  assert.equal(spoken("Friday at 11:00 PM"), "Friday at eleven p m");
  assert.equal(spoken("Sunday night, 12:30 am"), "Sunday night, twelve thirty a m");
  assert.equal(spoken("7:30 a.m. tip-off"), "seven thirty a m tip-off");
  assert.equal(spoken("at 7 PM."), "at seven p m.");
});
test("24-hour times get their am or pm; other numbers are left alone", () => {
  assert.equal(spoken("19:00 and 00:30"), "seven p m and twelve thirty a m");
  assert.equal(spoken("a 2.50 average"), "a two point five zero average");
  assert.equal(spoken("247/3"), "two hundred and forty-seven for three");
});
test("a time is put the way people say it, from the day the episode goes out", async () => {
  const { sayAt } = await import("../engine/pack.mjs");
  const now = Date.parse("2026-10-17T07:00:00Z"), tz = "Asia/Kolkata"; // Saturday 17 Oct, 12:30 pm IST
  assert.equal(sayAt("2026-10-17T13:30:00Z", now, tz), "this evening, 7 pm");            // Sat 19:00
  assert.equal(sayAt("2026-10-18T19:00:00Z", now, tz), "late tomorrow night, 12:30 am"); // Mon 00:30 is Sunday night
  assert.equal(sayAt("2026-10-21T19:00:00Z", now, tz), "late Wednesday night, 12:30 am"); // Thu 00:30
  assert.equal(sayAt("2026-10-22T02:00:00Z", now, tz), "Thursday morning, 7:30 am");
  assert.equal(sayAt("2026-10-22T07:00:00Z", now, tz), "Thursday afternoon, 12:30 pm");
  assert.equal(sayAt("2026-10-23T17:30:00Z", now, tz), "Friday night, 11 pm");
  assert.equal(sayAt("2026-10-25T20:00:00Z", now, tz), "Sunday 25 October, late night, 1:30 am"); // Mon 26 Oct 01:30, the US GP, a week on
  assert.equal(sayAt("2026-10-29T14:00:00Z", now, tz), "Thursday 29 October, evening, 7:30 pm");
});
test("the listening check catches words leaked across a cut", async () => {
  const { execFileSync } = await import("node:child_process");
  const py = `import sys; sys.path.insert(0, "engine/audio")
from verify_lines import edge_leak, words
prev = words("But at least there is one huge relief: Jude Bellingham has agreed a contract extension until 2031.", True)
own = words("That is massive news. Now, have you seen the rain outside over Bengaluru today?", True)
print(edge_leak(words("Jude Bellingham has agreed a contract extension until 2031. That is massive news. Now have you seen the rain over Bengaluru today?", False), own, prev, []))
print(edge_leak(words("That is massive news. Now have you seen the rain outside over Bengaluru today?", False), own, prev, []))`;
  const out = execFileSync("python3", ["-c", py], { cwd: new URL("..", import.meta.url).pathname }).toString().trim().split("\n");
  assert.deepEqual(out, ["starts with the line before", "None"]);
});
test("a colon inside a line is said as a comma", () => {
  assert.equal(spoken("one huge relief: Jude Bellingham has agreed, at 7:30 PM."), "one huge relief, Jude Bellingham has agreed, at seven thirty p m.");
});
test("an unplayed final is never a result", async () => {
  const { bigMatches } = await import("../engine/fetch/tennis.mjs");
  const m = (players, round = "Final") => ({ state: "post", date: "2026-10-18T10:00:00Z", round, tournament: "Grand Prix Auvergne-Rhône-Alpes", players });
  const tbd = m([{ name: "TBD", won: false, sets: [] }, { name: "TBD", won: false, sets: [] }]);
  const real = m([{ name: "Rafael Jodar", won: true, sets: [6, 6] }, { name: "Daniil Medvedev", won: false, sets: [3, 4] }], "Semifinal");
  assert.deepEqual(bigMatches([tbd, real], { since: 0 }).map(x => x.players[0].name), ["Rafael Jodar"]);
});
test("a whole sentence cut into the wrong line is caught", async () => {
  const { execFileSync } = await import("node:child_process");
  // 19 Oct, Dhruv's take cut one sentence early: the third goal played after the fourth
  const py = `import sys; sys.path.insert(0, "engine/audio")
from verify_lines import misplaced, words
lines = ["Then Mbappe turned it on. Jude Bellingham fed him in the thirty-seventh minute. In the second half, sixty-three minutes in, Mbappe stepped up to convert a penalty for three-nil.",
         "Looking at the table, Barcelona lead on twenty-seven points, Atletico Madrid are second on twenty-two."]
want = [words(l, True) for l in lines]
bad = ["Then Mbappe turned it on. Jude Bellingham fed him in the 37th minute.",
       "In the second half, 63 minutes in, Mbappe stepped up to convert a penalty for 3-0. Looking at the table, Barcelona lead on 27 points, Atletico Madrid are second on 22."]
good = ["Then Mbappe turned it on. Jude Bellingham fed him in the 37th minute. In the second half, 63 minutes in, Mbappe stepped up to convert a penalty for 3-0.",
        "Looking at the table, Barcelona lead on 27 points, Atletico Madrid are second on 22."]
print(misplaced(want, [words(x, False) for x in bad]))
print(misplaced(want, [words(x, False) for x in good]))`;
  const out = execFileSync("python3", ["-c", py], { cwd: new URL("..", import.meta.url).pathname }).toString().trim().split("\n");
  assert.deepEqual(out, ["[0, 1]", "[]"]);
});
