// The cover of Side Effects of Sports (Parth chose it, 15 Oct 2026): a capsule on pitch green. The cap is a racetrack
// with four cars and Rx painted on the infield; the clear body holds a loose pile of balls (a basketball, a football,
// cricket and tennis balls), settled by gravity. Renders cover.png at 3000 x 3000 with playwright-core (then convert
// to cover.jpg). For a friend's show, change the balls in capsule() and the title in T().
import { chromium } from "playwright-core";

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@500;600;700&family=Fraunces:ital,opsz,wght@1,9..144,900&display=block" rel="stylesheet">`;
const page = (body, bg) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>html,body{margin:0;width:1000px;height:1000px;overflow:hidden;background:${bg}}*{box-sizing:border-box}</style></head><body>${body}</body></html>`;
const f = n => n.toFixed(1);
let uid = 0;
// ---- balls, centred on 0,0 with radius r ----
const pent = (cx, cy, s, rot) => [0, 1, 2, 3, 4].map(k => { const a = rot + k * 2 * Math.PI / 5; return `${f(cx + s * Math.cos(a))},${f(cy + s * Math.sin(a))}`; }).join(" ");
function football(r) {
  const id = `fbc${uid++}`, ink = "#16181d", w = r * 0.055;
  let s = `<defs><clipPath id="${id}"><circle r="${r * 0.97}"/></clipPath></defs><circle r="${r}" fill="#fff"/><g clip-path="url(#${id})">`;
  s += `<polygon points="${pent(0, 0, r * 0.3, -Math.PI / 2)}" fill="${ink}"/>`;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + k * 2 * Math.PI / 5, b = a + Math.PI / 5;
    s += `<line x1="${f(r * 0.3 * Math.cos(a))}" y1="${f(r * 0.3 * Math.sin(a))}" x2="${f(r * 0.62 * Math.cos(a))}" y2="${f(r * 0.62 * Math.sin(a))}" stroke="${ink}" stroke-width="${w}"/>`;
    s += `<line x1="${f(r * 0.62 * Math.cos(a))}" y1="${f(r * 0.62 * Math.sin(a))}" x2="${f(r * 0.8 * Math.cos(b))}" y2="${f(r * 0.8 * Math.sin(b))}" stroke="${ink}" stroke-width="${w}"/>`;
    s += `<line x1="${f(r * 0.62 * Math.cos(a))}" y1="${f(r * 0.62 * Math.sin(a))}" x2="${f(r * 0.8 * Math.cos(a - Math.PI / 5))}" y2="${f(r * 0.8 * Math.sin(a - Math.PI / 5))}" stroke="${ink}" stroke-width="${w}"/>`;
    s += `<polygon points="${pent(r * 1.02 * Math.cos(b), r * 1.02 * Math.sin(b), r * 0.3, b + Math.PI)}" fill="${ink}"/>`;
  }
  return s + `</g><circle r="${r}" fill="none" stroke="${ink}" stroke-width="${w}"/>`;
}
function cricket(r) {
  const seam = "#f3e6cf";
  let s = `<circle r="${r}" fill="#b3141f"/><g transform="rotate(-35)">`;
  s += `<line x1="${-r * 0.06}" y1="${-r}" x2="${-r * 0.06}" y2="${r}" stroke="${seam}" stroke-width="${r * 0.045}"/><line x1="${r * 0.06}" y1="${-r}" x2="${r * 0.06}" y2="${r}" stroke="${seam}" stroke-width="${r * 0.045}"/>`;
  for (const x of [-0.2, 0.2]) s += `<line x1="${r * x}" y1="${-r * 0.96}" x2="${r * x}" y2="${r * 0.96}" stroke="${seam}" stroke-width="${r * 0.09}" stroke-dasharray="${r * 0.035} ${r * 0.075}"/>`;
  return s + `</g><circle r="${r}" fill="none" stroke="#7d0d16" stroke-width="${r * 0.05}"/>`;
}
const basketball = r => `<circle r="${r}" fill="#e8742a"/><g fill="none" stroke="#3a1c0b" stroke-width="${r * 0.06}" stroke-linecap="round"><line x1="${-r}" y1="0" x2="${r}" y2="0"/><line x1="0" y1="${-r}" x2="0" y2="${r}"/><path d="M ${-r * 0.62} ${-r * 0.78} Q ${-r * 0.2} 0 ${-r * 0.62} ${r * 0.78}"/><path d="M ${r * 0.62} ${-r * 0.78} Q ${r * 0.2} 0 ${r * 0.62} ${r * 0.78}"/></g><circle r="${r}" fill="none" stroke="#3a1c0b" stroke-width="${r * 0.06}"/>`;
const tennis = r => `<circle r="${r}" fill="#d7ef3b"/><g fill="none" stroke="#fff" stroke-width="${r * 0.1}" stroke-linecap="round"><path d="M ${-r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 1 ${-r * 0.62} ${r * 0.78}"/><path d="M ${r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 0 ${r * 0.62} ${r * 0.78}"/></g><circle r="${r}" fill="none" stroke="#9fb51f" stroke-width="${r * 0.05}"/>`;
function golf(r) {
  const id = `gc${uid++}`, gid = `gg${uid++}`;
  let s = `<defs><clipPath id="${id}"><circle r="${r * 0.94}"/></clipPath><radialGradient id="${gid}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3e8"/></radialGradient></defs><circle r="${r}" fill="url(#${gid})"/><g clip-path="url(#${id})" fill="#c9cfd6">`;
  const d = r * 0.24;
  for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) { const x = col * d + (row % 2 ? d / 2 : 0), y = row * d * 0.87; if (x * x + y * y < r * r) { const k = 1 - Math.hypot(x, y) / r * 0.45; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.075 * k)}"/>`; } }
  return s + `</g><circle r="${r}" fill="none" stroke="#aab2bc" stroke-width="${r * 0.05}"/>`;
}
const baseball = r => `<circle r="${r}" fill="#fbfaf6"/><g fill="none" stroke="#d0202f" stroke-width="${r * 0.05}"><path d="M ${-r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 1 ${-r * 0.62} ${r * 0.78}"/><path d="M ${r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 0 ${r * 0.62} ${r * 0.78}"/></g><g fill="none" stroke="#d0202f" stroke-width="${r * 0.12}" stroke-dasharray="${r * 0.04} ${r * 0.1}"><path d="M ${-r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 1 ${-r * 0.62} ${r * 0.78}"/><path d="M ${r * 0.62} ${-r * 0.78} A ${r * 0.95} ${r * 0.95} 0 0 0 ${r * 0.62} ${r * 0.78}"/></g><circle r="${r}" fill="none" stroke="#b9b4a6" stroke-width="${r * 0.05}"/>`;
const BALL = { football, cricket, basketball, tennis, golf, baseball };

// seeded random
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ---- geometry, local coords, capsule centred on 0,0 ----
const BODY = { x0: -60, x1: 380, h: 130 }, CAP = { x0: -380, x1: 30, h: 138 }, WALL = 7, SEEN = CAP.x1 + 4;
const capPath = `M ${CAP.x1} ${-CAP.h} L ${CAP.x0 + CAP.h} ${-CAP.h} A ${CAP.h} ${CAP.h} 0 0 0 ${CAP.x0 + CAP.h} ${CAP.h} L ${CAP.x1} ${CAP.h} Z`;
const bodyPath = `M ${BODY.x0} ${-BODY.h} L ${BODY.x1 - BODY.h} ${-BODY.h} A ${BODY.h} ${BODY.h} 0 0 1 ${BODY.x1 - BODY.h} ${BODY.h} L ${BODY.x0} ${BODY.h} Z`;

// a loose pile: each ball drops to the lowest free spot (gravity g in local coords)
function pile(balls, g, seed) {
  const R = rng(seed), out = [], end = BODY.x1 - BODY.h, inner = BODY.h - WALL;
  for (const b of balls) {
    let best = null, bestScore = -1e9;
    for (let x = SEEN; x <= BODY.x1; x += 2) for (let y = -inner; y <= inner; y += 2) {
      if (x - b.r < SEEN) continue;
      if (x > end ? Math.hypot(x - end, y) > inner - b.r : Math.abs(y) > inner - b.r) continue;
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < o.r + b.r + 1.5)) continue;
      const s = x * g[0] + y * g[1] + R() * 0.8;
      if (s > bestScore) { bestScore = s; best = { x, y }; }
    }
    if (best) out.push({ ...b, ...best, rot: Math.round(R() * 360) });
  }
  return out;
}

// ---- a cute top-down F1 car pointing +x ----
const car = (c, x, y, deg, s = 1.2) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${deg}) scale(${s})">
  <rect x="-17" y="-9.5" width="5" height="19" rx="1.5" fill="#1b1d22"/>
  <rect x="-13" y="-11" width="8" height="5" rx="2" fill="#111"/><rect x="-13" y="6" width="8" height="5" rx="2" fill="#111"/>
  <rect x="5" y="-10.5" width="7" height="4.5" rx="2" fill="#111"/><rect x="5" y="6" width="7" height="4.5" rx="2" fill="#111"/>
  <path d="M -14 -5 Q -10 -7 -2 -6.5 L 8 -3.5 Q 15 -2 17 0 Q 15 2 8 3.5 L -2 6.5 Q -10 7 -14 5 Z" fill="${c}"/>
  <rect x="15" y="-9" width="4" height="18" rx="1.5" fill="${c}"/>
  <circle cx="-3" cy="0" r="3.4" fill="#fff"/><circle cx="-3" cy="0" r="3.4" fill="none" stroke="#1b1d22" stroke-width="1"/></g>`;

// ---- the cap: grass, a stadium circuit with kerbs, a start line, four cars ----
function capPrint({ rx = false } = {}) {
  const L = -232, Rt = -92, c = 72, o = 90, i = 54;
  const stad = r => `M ${Rt} ${-r} L ${L} ${-r} A ${r} ${r} 0 0 0 ${L} ${r} L ${Rt} ${r} A ${r} ${r} 0 0 0 ${Rt} ${-r} Z`;
  const arcL = r => `M ${L} ${-r} A ${r} ${r} 0 0 0 ${L} ${r}`, arcR = r => `M ${Rt} ${r} A ${r} ${r} 0 0 0 ${Rt} ${-r}`;
  let s = `<rect x="-400" y="-150" width="440" height="300" fill="#3c9d53"/>`;
  for (let x = -400; x < 40; x += 48) s += `<rect x="${x}" y="-150" width="24" height="300" fill="#37934d"/>`;
  s += `<path d="${stad(o + 6)}" fill="#e9ede9" opacity=".5"/><path d="${stad(o)}" fill="#3a3d45"/><path d="${stad(i)}" fill="#3c9d53"/>`;
  s += `<path d="${stad(i)}" fill="none" stroke="#fff" stroke-width="2.5"/><path d="${stad(o)}" fill="none" stroke="#fff" stroke-width="2.5"/>`;
  for (const a of [arcL, arcR]) for (const r of [o - 4, i + 4]) s += `<path d="${a(r)}" fill="none" stroke="#fff" stroke-width="8"/><path d="${a(r)}" fill="none" stroke="#e02434" stroke-width="8" stroke-dasharray="9 9"/>`;
  for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) s += `<rect x="${-150 + j * 6}" y="${-o + 3 + k * 5}" width="6" height="5" fill="${(k + j) % 2 ? "#111" : "#fff"}"/>`;
  if (rx) s += `<text x="${(L + Rt) / 2}" y="22" text-anchor="middle" font-family="Fraunces" font-style="italic" font-weight="900" font-size="64" fill="#fff" opacity=".92">Rx</text>`;
  const onL = a => [L + c * Math.cos(a * Math.PI / 180), c * Math.sin(a * Math.PI / 180), a + 90];
  const onR = a => [Rt + c * Math.cos(a * Math.PI / 180), c * Math.sin(a * Math.PI / 180), a + 90];
  s += car("#e10600", -120, -c, 0) + car("#1e3bd1", ...onR(35)) + car("#ff8a00", -175, c, 180) + car("#00a19c", ...onL(215));
  return s;
}

// ---- the capsule ----
function capsule({ rot = -14, glass = "rgba(255,255,255,.13)", rim = "rgba(255,255,255,.85)", rx = false, seed = 7 } = {}) {
  const id = n => `${n}${uid++}`, cc = id("cc"), bc = id("bc"), sh = id("sh"), gl = id("gl"), bl = id("bl"), bl2 = id("bl2");
  const balls = pile([{ k: "basketball", r: 56 }, { k: "cricket", r: 23 }, { k: "football", r: 51 }, { k: "tennis", r: 22 }, { k: "cricket", r: 23 }, { k: "tennis", r: 22 }, { k: "cricket", r: 23 }, { k: "tennis", r: 22 }, { k: "tennis", r: 22 }, { k: "cricket", r: 23 }, { k: "tennis", r: 22 }, { k: "cricket", r: 23 }, { k: "tennis", r: 22 }, { k: "cricket", r: 23 }, { k: "tennis", r: 22 }], [Math.sin(rot * Math.PI / 180), Math.cos(rot * Math.PI / 180)], seed);
  return `<defs>
    <clipPath id="${cc}"><path d="${capPath}"/></clipPath><clipPath id="${bc}"><path d="${bodyPath}"/></clipPath>
    <linearGradient id="${sh}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".1" stop-color="#fff" stop-opacity=".30"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
    <linearGradient id="${gl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".25" stop-color="#fff" stop-opacity=".04"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
    <filter id="${bl}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="${bl2}" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="3"/></filter></defs>
  <g transform="translate(10 26)" filter="url(#${bl})" opacity=".45"><path d="${bodyPath}" fill="#000"/><path d="${capPath}" fill="#000"/></g>
  <path d="${bodyPath}" fill="${glass}"/>
  <g clip-path="url(#${bc})">${balls.map(b => `<g transform="translate(${b.x} ${b.y}) rotate(${b.rot})">${BALL[b.k](b.r)}</g>`).join("")}
    <path d="${bodyPath}" fill="url(#${gl})"/>
    <rect x="${SEEN}" y="-130" width="16" height="260" fill="#000" opacity=".18"/></g>
  <path d="${bodyPath}" fill="none" stroke="${rim}" stroke-width="5"/>
  <g clip-path="url(#${cc})">${capPrint({ rx })}<path d="${capPath}" fill="url(#${sh})"/></g>
  <path d="${capPath}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3"/>
  <line x1="${CAP.x1 - 2}" y1="${-CAP.h + 6}" x2="${CAP.x1 - 2}" y2="${CAP.h - 6}" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
  <path d="M ${CAP.x0 + 70} ${-CAP.h + 26} L ${CAP.x1 - 30} ${-CAP.h + 26}" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".55" filter="url(#${bl2})"/>
  <path d="M ${SEEN + 30} ${-BODY.h + 24} L ${BODY.x1 - 70} ${-BODY.h + 24}" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".7" filter="url(#${bl2})"/>`;
}

const svg = (inner, bg) => `<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">${bg}${inner}</svg>`;
const T = (color, size, align = "left") => `<div style="font:900 ${size}px/0.95 'Archivo Black';letter-spacing:-.01em;color:${color};text-align:${align}">Side Effects<br>of Sports</div>`;
const tag = (c, extra = "") => `<div style="margin-top:24px;font:600 30px 'Inter';color:${c}">${extra}Take daily</div>`;
const RX = (c, size) => `<span style="font:italic 900 ${size}px/1 'Fraunces';color:${c}">Rx</span>`;

const V = {};
// 1. Pitch green, tilted, Rx painted on the infield
V.cover = page(svg(`<g transform="translate(500 330) rotate(-14) scale(1.02)">${capsule({ rot: -14, rx: true, glass: "rgba(225,255,240,.14)" })}</g>`, `<rect width="1000" height="1000" fill="#0f3d2e"/>`) +
  `<div style="position:absolute;left:92px;right:60px;bottom:104px">${T("#fff", 108)}${tag("#9fe0bd")}</div>`, "#0f3d2e");

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", proxy });
const ctx = await b.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 3, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
for (const [name, html] of Object.entries(V)) {
  await p.setContent(html, { waitUntil: "networkidle", timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${name}.png`, clip: { x: 0, y: 0, width: 1000, height: 1000 } });
  console.log("made", name);
}
await b.close();
