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
