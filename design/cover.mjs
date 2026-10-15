// The cover of Side Effects of Sports (Parth chose it, 15 Oct 2026): a capsule, one half an F1 hairpin, the other half
// a cricket ball, a football, a basketball and a tennis ball, on pitch green. Renders cover.png at 3000 x 3000
// (run with playwright-core; convert to cover.jpg). Change `balls` for a listener who follows other sports.
import { chromium } from "playwright-core";

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@500;600;700&display=block" rel="stylesheet">`;
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

// ---- the capsule, centred on 0,0, 720 x 280, track half on the left ----
const W = 720, H = 280, R = 140;
function trackHalf() {
  const k = R - 14, e = R - 30, inf = 52;
  return `<rect x="-360" y="-140" width="360" height="280" fill="#2b2e35"/>
  <path d="M 0 ${-k} L -220 ${-k} A ${k} ${k} 0 0 0 -220 ${k} L 0 ${k}" fill="none" stroke="#fff" stroke-width="24"/>
  <path d="M 0 ${-k} L -220 ${-k} A ${k} ${k} 0 0 0 -220 ${k} L 0 ${k}" fill="none" stroke="#d81e2a" stroke-width="24" stroke-dasharray="20 20"/>
  <path d="M 0 ${-e} L -220 ${-e} A ${e} ${e} 0 0 0 -220 ${e} L 0 ${e}" fill="none" stroke="#e9ecef" stroke-width="4"/>
  <path d="M 0 ${-inf} L -220 ${-inf} A ${inf} ${inf} 0 0 0 -220 ${inf} L 0 ${inf} Z" fill="#2f8a45"/>
  <path d="M 0 ${-inf} L -220 ${-inf} A ${inf} ${inf} 0 0 0 -220 ${inf} L 0 ${inf}" fill="none" stroke="#e9ecef" stroke-width="4"/>
  ${Array.from({ length: 6 }, (_, i) => [0, 1].map(j => `<rect x="${-110 + j * 12}" y="${-e + 2 + i * 9.6}" width="12" height="9.6" fill="${(i + j) % 2 ? "#111" : "#fff"}"/>`).join("")).join("")}`;
}
const SLOTS = [[72, -64], [72, 64], [182, -64], [182, 64], [292, 0]];
function capsule({ balls = ["cricket", "football", "basketball", "tennis", "golf"], slots = SLOTS, br = 48, shell = "#f6f5f1", outline = "#e8ecf5", clear = false, gloss = true } = {}) {
  const c = `cap${uid++}`, L = `l${uid++}`, Rr = `r${uid++}`;
  return `<defs><clipPath id="${c}"><rect x="-360" y="-140" width="${W}" height="${H}" rx="${R}"/></clipPath><clipPath id="${L}"><rect x="-360" y="-140" width="360" height="280"/></clipPath><clipPath id="${Rr}"><rect x="0" y="-140" width="360" height="280"/></clipPath></defs>
  <rect x="-352" y="-128" width="${W}" height="${H}" rx="${R}" fill="#000" opacity=".22" transform="translate(8 18)"/>
  <g clip-path="url(#${c})">
    <g clip-path="url(#${L})">${trackHalf()}</g>
    <g clip-path="url(#${Rr})"><rect x="0" y="-140" width="360" height="280" fill="${clear ? "rgba(255,255,255,.10)" : shell}"/>
      ${balls.map((b, i) => `<g transform="translate(${slots[i][0]} ${slots[i][1]})">${BALL[b](br)}</g>`).join("")}
      ${clear ? `<rect x="0" y="-140" width="360" height="280" fill="rgba(255,255,255,.08)"/>` : ""}</g>
    ${gloss ? `<path d="M -300 -104 Q 0 -128 300 -104" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".22"/>` : ""}
  </g>
  <rect x="-360" y="-140" width="${W}" height="${H}" rx="${R}" fill="none" stroke="${outline}" stroke-width="10"/>
  <line x1="0" y1="-136" x2="0" y2="136" stroke="${outline}" stroke-width="10"/>`;
}

const title = (color, sub, subColor, size = 112, name = "Sport") => `<div style="font:900 ${size}px/0.95 'Archivo Black';letter-spacing:-.01em;color:${color}">Side Effects<br>of ${name}</div>${sub ? `<div style="margin-top:26px;font:600 30px 'Inter';letter-spacing:.02em;color:${subColor}">${sub}</div>` : ""}`;
const svg = (inner, bg) => `<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">${bg}${inner}</svg>`;
const navyBg = `<defs><radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#18284f"/><stop offset="1" stop-color="#070d1f"/></radialGradient></defs><rect width="1000" height="1000" fill="url(#bg)"/>`;

const V = {};
const FOUR = { balls: ["cricket", "football", "basketball", "tennis"], slots: [[100, -64], [100, 64], [232, -64], [232, 64]], br: 56 };
for (const name of ["Sports"])
  V.cover = page(svg(`<g transform="translate(500 330) rotate(-14) scale(.98)">${capsule(FOUR)}</g>`, `<rect width="1000" height="1000" fill="#0f3d2e"/>`) +
    `<div style="position:absolute;left:96px;right:60px;bottom:110px;text-align:left">${title("#fff", "Take daily", "#9fe0bd", 108, name)}</div>`, "#0f3d2e");

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
