// The news around the results: RSS from the sport desks (config/feeds.json) and a Google News search per followed
// name. Code groups reports of the same story and ranks them by how many outlets ran it (the paper's rule: a story two
// outlets lead with is news). The writer only ever sees these headlines and summaries, never the open web.
import { getText } from "../http.mjs";

const STOP = new Set("the a an and or of to in on at for with from by as is are was were be been his her their its after before over into than this that says say said will can new vs v".split(" "));
// live blogs, previews of odds, how-to-watch pages and lists are not news
const NOISE = /\b(live|as it happened|how to watch|where to watch|tv channel|live stream|prediction|predicted|odds|betting|tips|player ratings|quiz|in pictures|in photos|gallery|podcast|newsletter|game analysis|scorecard|highlights|records (?:&|and) stats|playing (?:11|xi)|dream11|fantasy)\b/i;

const decode = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g, "'").replace(/&#8216;|&lsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const strip = s => decode(decode(s)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (x, t) => x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"))?.[1] ?? "";

// RSS (<item>) and Atom (<entry>, which every SB Nation team site uses: Managing Madrid, Golden State of Mind)
export function parseRSS(xml, feed) {
  return [...String(xml).matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(([x]) => {
    let title = strip(tag(x, "title")), source = feed.name;
    // Google News: "Headline - Outlet", with the outlet in <source>
    const gsrc = strip(tag(x, "source"));
    if (gsrc) { source = gsrc; title = title.replace(new RegExp(`\\s+-\\s+${gsrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""); }
    const date = Date.parse(strip(tag(x, "pubDate")) || strip(tag(x, "dc:date")) || strip(tag(x, "published")) || strip(tag(x, "updated")) || "") || null;
    const summary = gsrc ? "" : strip(tag(x, "description") || tag(x, "summary") || tag(x, "content")).slice(0, 400);
    const url = strip(tag(x, "link")) || x.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    return { title, url, date, source, summary, feed: feed.id, kind: feed.kind };
  }).filter(i => i.title);
}

const words = t => new Set(String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1); };
const RANK = { official: 3, lead: 3, news: 2, signal: 1, search: 1 };

// Reports of the same story, together: each cluster's outlets, its best headline and the summaries the writer may use
export function cluster(items) {
  const out = [];
  for (const it of items.sort((a, b) => (RANK[b.kind] || 0) - (RANK[a.kind] || 0) || (b.date || 0) - (a.date || 0))) {
    const w = words(it.title), c = out.find(c => jaccard(w, c.w) >= 0.3);
    if (c) { c.items.push(it); for (const x of w) c.w.add(x); } else out.push({ w, items: [it] });
  }
  return out.map(c => {
    const outlets = [...new Set(c.items.map(i => i.source))], lead = c.items[0];
    const sports = c.items.map(i => i.sport).filter(Boolean), sport = sports.sort((a, b) => sports.filter(x => x === b).length - sports.filter(x => x === a).length)[0] || null;
    return { headline: lead.title, sport, outlets, n: outlets.length, date: Math.max(...c.items.map(i => i.date || 0)), url: lead.url,
      reports: c.items.filter(i => i.summary).slice(0, 3).map(i => ({ source: i.source, title: i.title, summary: i.summary })) };
  }).sort((a, b) => b.n - a.n || b.date - a.date);
}

export async function feeds(list, { since }) {
  const got = await Promise.all(list.map(f => getText(f.url, { timeout: 12000 }).then(x => parseRSS(x, f).map(i => ({ ...i, sport: f.sport || null }))).catch(() => [])));
  return got.flat().filter(i => (!i.date || i.date >= since) && !NOISE.test(i.title));
}

export const searchFeed = (q, lang = "en-IN", sport = null) => {
  const [hl, gl] = [lang, lang.split("-")[1] || "IN"];
  return { sport, id: `gn-${q.toLowerCase().replace(/\W+/g, "-")}`, name: "Google News", kind: "search", url: `https://news.google.com/rss/search?q=${encodeURIComponent(`"${q}" when:2d`)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split("-")[0]}` };
};
