// Network helpers: a timeout on every request, a browser's user-agent for the pages that want one, and one retry.
// In a Claude Code cloud session Node's fetch needs NODE_USE_ENV_PROXY=1 to use the session's proxy; ensureProxy()
// relaunches the script once with it set (the same fix as The House of 1400's scripts/proxy.mjs). On GitHub Actions
// there is no proxy and it does nothing.
import { spawnSync } from "node:child_process";

export function ensureProxy() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY === "1") return;
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1", HTTP_PROXY: process.env.HTTP_PROXY || proxy, NODE_NO_WARNINGS: "1" } });
  process.exit(r.status ?? 1);
}

export const UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };

async function get(url, { timeout = 15000, headers = {} } = {}) {
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(timeout) });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
      return r;
    } catch (e) { last = e; }
  }
  throw last;
}
export const getJSON = (url, o) => get(url, o).then(r => r.json());
export const getText = (url, o) => get(url, o).then(r => r.text());
