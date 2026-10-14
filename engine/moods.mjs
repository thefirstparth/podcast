// The mood of each item, decided by code from the listener's stance and the result's facts (config/show.json
// mood_rules), never by the writer. The rules are small expressions over the facts the fetchers work out
// (won, lost, drew, big, close, came_from_behind, lead_lost, late_decider, conceded_late, red_card, upset,
// eliminated, title, podium, dnf, finished_low, preseason, stage); the first that holds sets the mood.
const OK = /^[\w\s&|!=()'.<>-]*$/, WORDS = new Set(["true", "false"]);

export function compile(expr) {
  if (!OK.test(expr)) throw new Error(`mood rule not allowed: ${expr}`);
  const ids = [...new Set(expr.replace(/'[^']*'/g, "").match(/[A-Za-z_]\w*/g) || [])].filter(w => !WORDS.has(w));
  const fn = new Function(...ids, `return (${expr});`);
  return facts => !!fn(...ids.map(i => facts[i] ?? false));
}

const cache = new Map();
export function moodOf(facts, stance, rules) {
  const list = rules[stance] || [];
  for (const r of list) {
    if (!cache.has(r.if)) cache.set(r.if, compile(r.if));
    if (cache.get(r.if)(facts || {})) return r.mood;
  }
  return stance === "rival" ? null : "neutral";
}

// How strongly the mood is played, 1 to 5 (config/show.json intensity): the listener's care, then the stake, then the
// drama. The Fan plays it at this strength, the Anchor one lower.
export function intensityOf(care, f = {}) {
  if (f.preseason || f.stage === "friendly") return 1;
  let n = ({ "die-hard": 3, follow: 2, "big-moments": 1, rival: 3 })[care] || 1;
  if (f.stage === "final" || f.stage === "knockout" || f.derby || f.title || f.eliminated) n++;
  if (f.big || f.came_from_behind || f.lead_lost || f.late_decider || f.upset || f.losing_run || f.winless_run || (f.won && f.stage === "race")) n++;
  return Math.min(5, n);
}
