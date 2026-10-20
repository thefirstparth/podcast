// The news around the results: RSS from the sport desks (config/feeds.json) and a Google News search per followed
// name. Code groups reports of the same story and ranks them by how many outlets ran it (the paper's rule: a story two
// outlets lead with is news). The writer only ever sees these headlines and summaries, never the open web.
import { getText, UA } from "../http.mjs";

const STOP = new Set("the a an and or of to in on at for with from by as is are was were be been his her their its after before over into than this that says say said will can new vs v".split(" "));
// live blogs, previews of odds, how-to-watch pages and lists are not news
const NOISE = /\b(live|as it happened|how to watch|where to watch|tv channel|live stream|livestream|prediction|predicted|odds|betting|tips|player ratings|quiz|in pictures|in photos|gallery|podcast|newsletter|game analysis|scorecard|highlights|records (?:&|and) stats|playing (?:11|xi)|dream11|fantasy|fan survey|reacts|web oficial|official site|confirmed line-?ups|line-?ups?|starting xi|keys to beating|preview|forum|spieltag|matchday thread)\b/i;

const decode = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g, "'").replace(/&#8216;|&lsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const strip = s => decode(decode(s)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (x, t) => x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"))?.[1] ?? "";

// RSS (<item>) and Atom (<entry>, which every SB Nation team site uses: Managing Madrid, Golden State of Mind)
export function parseRSS(xml, feed) {
  return [...String(xml).matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(([x]) => {
    let title = strip(tag(x, "title")), source = feed.name;
    // Google News: "Headline - Outlet", with the outlet in <source>
    const gsrc = strip(tag(x, "source"));
    if (gsrc) { source = gsrc; title = title.replace(new RegExp(`\\s+-\\s+${gsrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""); }
    // a site's name after a bar ("... | The Daily Guardian - newspaper") is not part of the headline
    title = title.replace(/\s+\|\s+[^|]{3,60}$/, "");
    const date = Date.parse(strip(tag(x, "pubDate")) || strip(tag(x, "dc:date")) || strip(tag(x, "published")) || strip(tag(x, "updated")) || "") || null;
    const summary = gsrc ? "" : strip(tag(x, "description") || tag(x, "summary") || tag(x, "content")).slice(0, 400);
    const url = strip(tag(x, "link")) || x.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    return { title, url, date, source, summary, feed: feed.id, kind: feed.kind, paywall: !!feed.paywall };
  }).filter(i => i.title);
}

const words = t => new Set(String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1); };
const RANK = { official: 3, lead: 3, news: 2, signal: 1, search: 1 };

// Reports of the same story, together: each cluster's outlets, its best headline and the summaries the writer may use.
// Two headlines are one story when they share most of their words, three words that are rare in the day's news, or two
// rare word pairs: "Six Kings Slam postponed to December" and "Carlos Alcaraz's schedule complaints to be tested as Six
// Kings Slam postponed" share "six kings" and "kings slam", which only that story uses (15 Oct, Parth: one story in
// seven outlets had been split into three). One shared pair is not enough: "Champions League" or "World Cup" is in
// many stories.
export function cluster(items) {
  const out = [], df = new Map(), bf = new Map();
  // word pairs in order ("six kings", "kings slam"): a pair few headlines share names one story
  const pairs = t => { const w = String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(x => x.length > 2 && !STOP.has(x)); return new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`)); };
  for (const it of items) { for (const w of words(it.title)) df.set(w, (df.get(w) || 0) + 1); for (const p of pairs(it.title)) bf.set(p, (bf.get(p) || 0) + 1); }
  const cap = Math.max(12, items.length * 0.01);
  const rare = w => { const n = df.get(w) || 0; return n >= 2 && n <= cap && !/^\d+$/.test(w); };
  const rarePair = p => { const n = bf.get(p) || 0; return n >= 2 && n <= cap && !/\d/.test(p); };
  for (const it of items.sort((a, b) => (RANK[b.kind] || 0) - (RANK[a.kind] || 0) || (b.date || 0) - (a.date || 0))) {
    const w = words(it.title), r = new Set([...w].filter(rare)), p = new Set([...pairs(it.title)].filter(rarePair));
    // compared with the story's first three headlines only, so one story never snowballs into several
    const c = out.find(c => jaccard(w, c.w) >= 0.3 || [...r].filter(x => c.r.has(x)).length >= 3 || [...p].filter(x => c.p.has(x)).length >= 2);
    if (c) { c.items.push(it); if (c.items.length <= 3) { for (const x of w) c.w.add(x); for (const x of r) c.r.add(x); for (const x of p) c.p.add(x); } } else out.push({ w, r, p, items: [it] });
  }
  return out.map(c => {
    const outlets = [...new Set(c.items.map(i => i.source))], lead = c.items[0];
    const sports = c.items.map(i => i.sport).filter(Boolean), sport = sports.sort((a, b) => sports.filter(x => x === b).length - sports.filter(x => x === a).length)[0] || null;
    return { headline: lead.title, sport, outlets, n: outlets.length, date: Math.max(...c.items.map(i => i.date || 0)), url: lead.url,
      reports: c.items.filter(i => i.summary).slice(0, 3).map(i => ({ source: i.source, title: i.title, summary: i.summary })),
      links: c.items.filter(i => i.url && !i.paywall).map(i => ({ source: i.source, url: i.url })), titles: c.items.map(i => i.title) };
  }).sort((a, b) => b.n - a.n || b.date - a.date);
}

// One story that the first pass left in pieces (15 Oct: the Six Kings Slam postponement came out as three Alcaraz
// stories, because a big story's own words are too common that day to count as rare). Two clusters are one story when
// their headlines share two distinctive phrases, one of them three words or more ("six kings slam" and "postponed
// december"). A phrase is distinctive when few of the day's clusters use it and it is not a followed name ("carlos
// alcaraz", "real madrid"): a competition's name alone ("United States Grand Prix") never joins two stories.
const tokens = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(x => x.length > 2 && !STOP.has(x));
const pairsIn = titles => new Set(titles.flatMap(t => { const w = tokens(t); return w.slice(1).map((x, i) => `${w[i]} ${x}`); }));
export function storyIndex(clusters, names = []) {
  const df = new Map(), ignore = new Set(names.flatMap(tokens));
  for (const c of clusters) for (const p of pairsIn(c.titles)) df.set(p, (df.get(p) || 0) + 1);
  return { df, ignore, lim: Math.max(6, Math.round(clusters.length * 0.008)) };
}
export function sameStory(a, b, { df, ignore, lim }) {
  const pb = pairsIn(b.titles);
  const shared = [...pairsIn(a.titles)].filter(p => pb.has(p) && (df.get(p) || 0) <= lim && !/\d/.test(p) && !p.split(" ").some(w => ignore.has(w)));
  if (shared.length < 2) return false;
  // phrases: overlapping pairs ("six kings", "kings slam") make one phrase
  const root = shared.map((_, i) => i), find = i => (root[i] === i ? i : (root[i] = find(root[i])));
  for (let i = 0; i < shared.length; i++) for (let j = i + 1; j < shared.length; j++) { const [a1, b1] = shared[i].split(" "), [a2, b2] = shared[j].split(" "); if (b1 === a2 || b2 === a1) root[find(i)] = find(j); }
  const size = new Map(); for (let i = 0; i < shared.length; i++) size.set(find(i), (size.get(find(i)) || 0) + 1);
  if (size.size >= 3 || (size.size >= 2 && [...size.values()].some(n => n >= 2))) return true;
  // one long phrase is enough when it says what happened, not only whose or where: four words or more with an
  // ordinary (lower-case) word in both headlines ("Six Kings Slam postponed amid"), never a name alone ("United States
  // Grand Prix")
  const low = titles => new Set(titles.flatMap(t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^A-Za-z0-9]+/).filter(w => /^[a-z]/.test(w) && w.length > 2 && !STOP.has(w))));
  const la = low(a.titles), lb = low(b.titles);
  return [...size.entries()].some(([r, n]) => n >= 3 && shared.some((p, i) => find(i) === r && p.split(" ").some(w => la.has(w) && lb.has(w))));
}
// Two chosen stories whose texts tell the same thing in other words (15 Oct: "Alcaraz returns to Vienna after five
// years" and "Alcaraz set for Vienna Open return after four-year absence"): ten or more shared two-word phrases, at
// least an eighth of the shorter text's, followed names left out. Checked only on the few stories already chosen.
export function sameText(a, b, names = []) {
  const ignore = new Set(names.flatMap(tokens)), pp = t => { const w = tokens(t).filter(x => !ignore.has(x)); return new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`)); };
  const A = pp(a.text?.text || ""), B = pp(b.text?.text || "");
  if (!A.size || !B.size) return false;
  let n = 0; for (const p of A) if (B.has(p)) n++;
  return n >= 10 && n / Math.min(A.size, B.size) >= 0.12;
}

// fold cluster b into a (a keeps its headline)
export function fold(a, b) {
  a.titles = [...a.titles, ...b.titles]; a.outlets = [...new Set([...a.outlets, ...b.outlets])]; a.n = a.outlets.length; a.date = Math.max(a.date || 0, b.date || 0);
  a.links = [...(a.links || []), ...(b.links || [])]; a.reports = [...(a.reports || []), ...(b.reports || [])].slice(0, 3);
  return a;
}

// An article's text: the JSON-LD articleBody when the page has one, else its paragraphs. Copied from The House of
// 1400 (lib/pool.js articleText), where it reads the day's pool. Only the opening is kept: enough for the writer to
// tell the story in its own words, never to read it out.
const JUNK = /\b(subscribe|sign up|newsletter|cookie|advertisement|all rights reserved|read more:|also read|follow us|download the app|click here|whatsapp channel|recommended stories|watch:|listen to)\b/i;
export function articleText(html) {
  const s = String(html || "");
  for (const m of s.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = o => (Array.isArray(o) ? o.map(walk).find(Boolean) : o && typeof o === "object" ? (typeof o.articleBody === "string" && o.articleBody.length > 300 ? o.articleBody : Object.values(o).map(walk).find(Boolean)) : null);
      const body = walk(JSON.parse(m[1].trim()));
      if (body) return decode(body).replace(/\s+/g, " ").trim();
    } catch {}
  }
  const scope = s.match(/<article[\s>][\s\S]*?<\/article>/i)?.[0] || s;
  const paras = [...scope.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)].map(m => decode(m[0].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()).filter(p => p.length >= 60 && !JUNK.test(p));
  return [...new Set(paras)].join(" ");
}
const metaOf = (html, prop) => decode(String(html).match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)`, "i"))?.[1] || "");
// (a paywalled source's link is never read: it only counts towards the outlets)
// A Google News link's publisher address, asked of Google News the way its own page does (copied from The House of
// 1400, lib/pool.js publisherOf, where it has run since 3 Oct 2026)
const isGoogle = u => { try { return /(^|\.)google\.com$/.test(new URL(u).hostname); } catch { return false; } };
export function parseBatchexecute(text) {
  for (const line of String(text).replace(/^\)\]\}'/, "").split("\n")) {
    if (!line.startsWith("[")) continue;
    try {
      for (const row of JSON.parse(line)) {
        if (!Array.isArray(row) || row[0] !== "wrb.fr" || row[1] !== "Fbv4je" || typeof row[2] !== "string") continue;
        const addr = JSON.parse(row[2])?.[1];
        if (typeof addr === "string" && /^https:\/\//.test(addr) && !isGoogle(addr)) return addr;
      }
    } catch {}
  }
  return null;
}
async function publisherOf(url) {
  if (!isGoogle(url)) return url;
  const id = (() => { try { return new URL(url).pathname.match(/^\/(?:rss\/)?articles\/([\w-]+)/)?.[1] || null; } catch { return null; } })();
  if (!id) return null;
  const page = await getText(`https://news.google.com/rss/articles/${id}`, { timeout: 6000 });
  const sg = page.match(/data-n-a-sg="([^"]+)"/)?.[1], ts = Number(page.match(/data-n-a-ts="(\d+)"/)?.[1]);
  if (!sg || !ts) return null;
  const inner = JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, ts, sg]);
  const r = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", { method: "POST", signal: AbortSignal.timeout(6000),
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8", ...UA }, body: "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]])) });
  return r.ok ? parseBatchexecute(await r.text()) : null;
}

// The best report of a cluster, read to about 1,200 characters (desk feeds first, then Google News links followed to
// the publisher); its description when the body cannot be read
// A text cut to length ends on its last whole sentence (20 Oct: "the Warriors are already missing Jimmy Butler III and
// Moses", cut mid-name, went on air as "and Moses"); with no sentence end in it, on its last whole word.
export function toSentence(t) {
  const s = String(t || ""), end = Math.max(...[...s.matchAll(/[.!?]["'’”)]?(?=\s|$)/g)].map(m => m.index + m[0].length), -1);
  return end > s.length * 0.4 ? s.slice(0, end) : s.replace(/\s+\S*$/, "");
}
export async function readCluster(c, max = 1200) {
  const links = [...(c.links || [])].sort((a, b) => isGoogle(a.url) - isGoogle(b.url)).slice(0, 4);
  for (const r of links) {
    try {
      const url = await publisherOf(r.url);
      if (!url) continue;
      const html = await getText(url, { timeout: 10000 });
      const text = articleText(html), desc = metaOf(html, "og:description") || metaOf(html, "description");
      const body = toSentence((text.length > 200 ? text : desc).slice(0, max));
      // the page's own publication date, when it says (16 Oct: an outlet's feed re-dated a week-old match report)
      const published = metaOf(html, "article:published_time") || String(html).match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] || null;
      if (body.length > 80) return { source: r.source, url, text: body, published: published && !isNaN(Date.parse(published)) ? new Date(published).toISOString() : null };
    } catch {}
  }
  return null;
}

// English only (Parth, 15 Oct). A headline is taken as another language when it has more of the common little words
// of Spanish, Portuguese, Italian or French than of English, and at least two of them.
const EN = new Set("the a an of and to in for on with after as is at by his her their from vs win wins beat beats over into says will has have was be".split(" "));
const XX = new Set("el la los las del de que y en con por para una un al se su sus lo es da do dos das na no il le les des et est pour sur dans du une ao à às pelo pela".split(" "));
export function isEnglish(t) {
  const w = String(t).toLowerCase().split(/[^a-zà-ÿ']+/).filter(Boolean);
  const en = w.filter(x => EN.has(x)).length, xx = w.filter(x => XX.has(x)).length;
  return !(xx >= 2 && xx > en);
}

export async function feeds(list, { since }) {
  const got = await Promise.all(list.map(f => getText(f.url, { timeout: 12000 }).then(x => parseRSS(x, f).map(i => ({ ...i, sport: f.sport || null }))).catch(() => [])));
  return got.flat().filter(i => (!i.date || i.date >= since) && !NOISE.test(i.title) && isEnglish(i.title));
}

// A Google News search as a feed (the URL format: news.google.com/rss/search?q=...&hl=&gl=&ceid=). intitle: keeps
// only headlines that name the subject; when:2d keeps it fresh; site: reaches one outlet that has no feed of its own.
export const searchFeed = (q, lang = "en-IN", sport = null, { intitle = true, site = null, raw = false } = {}) => {
  const [hl, gl] = [lang, lang.split("-")[1] || "IN"];
  const query = `${raw ? q : intitle ? `intitle:"${q}"` : q}${site ? ` site:${site}` : ""} when:2d`;
  return { sport, id: `gn-${q.toLowerCase().replace(/\W+/g, "-")}${site ? `-${site}` : ""}`, name: "Google News", kind: "search", url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split("-")[0]}` };
};
