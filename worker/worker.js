// Goldin price proxy + price history (Cloudflare Workers, module syntax)
//
// GET /          -> {"gold18PerGram","usdtToman","goldUsdtPerOunce","ts","marketTs"}
// GET /history   -> {"hours":24,"points":[[ts,gold18PerGram,usdtToman,goldUsdtPerOunce],...]}
//                   needs the KV binding HISTORY; a cron trigger (every 5 min) records the points.
//
// How the 18k price is built:
//   1) persiantoolbox.ir/api/market gives gold.pricePerGram (rial) and currencies.IRR.rate (rial per USD).
//      Their ratio is the international 24k gold price in USD per gram, so their own rial rate cancels out.
//   2) USDT/IRT comes from Nobitex's public market stats (rial, divided by 10 to get toman).
//   3) gold18 = USD per gram x 18/24 x USDT price in toman. Gold per ounce in USDT treats 1 USDT as 1 USD.
// This is the international price at the exchange rate, without any domestic premium or discount.
//
// Optional variables: ALLOW_ORIGIN (your site's origin, default "*"), MARKET_API_URL.

const MARKET_URL = 'https://persiantoolbox.ir/api/market';
const NOBITEX_URL = 'https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls';
const TTL_MS = 30000;
const MAX_AGE_MS = 10 * 60000;
const HIST_KEY = 'h';
const MAX_POINTS = 2016;   // 7 days at 5-minute steps
const MIN_GAP_MS = 240000; // never store two points closer than 4 minutes

let cache = { ts: 0, body: null };

async function getUsdt() {
  const r = await fetch(NOBITEX_URL);
  if (!r.ok) throw new Error('usdt source ' + r.status);
  const j = await r.json();
  const s = j && j.stats && j.stats['usdt-rls'];
  const rial = Number(s && (s.latest || s.bestSell));
  if (!(rial > 0)) throw new Error('usdt format');
  return Math.round(rial / 10);
}

async function getGoldUsd(env) {
  const r = await fetch(env.MARKET_API_URL || MARKET_URL);
  if (!r.ok) throw new Error('market source ' + r.status);
  const j = await r.json();
  const d = j && j.ok && j.data;
  const irrPerGram = Number(d && d.gold && d.gold.pricePerGram);
  const irrPerUsd = Number(d && d.currencies && d.currencies.IRR && d.currencies.IRR.rate);
  const ts = Number(d && d.timestamp);
  if (!(irrPerGram > 0 && irrPerUsd > 0 && ts > 0)) throw new Error('market format');
  if (Date.now() - ts > MAX_AGE_MS) throw new Error('market data stale');
  return { usdPerGram24: irrPerGram / irrPerUsd, marketTs: ts };
}

async function snapshot(env) {
  const [usdt, g] = await Promise.all([getUsdt(), getGoldUsd(env)]);
  return {
    gold18PerGram: Math.round(g.usdPerGram24 * 0.75 * usdt),
    usdtToman: usdt,
    goldUsdtPerOunce: Math.round(g.usdPerGram24 * 31.1035 * 100) / 100,
    marketTs: g.marketTs
  };
}

async function readHistory(env) {
  try { const a = JSON.parse((await env.HISTORY.get(HIST_KEY)) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

async function record(env) {
  if (!env.HISTORY) return;
  const p = await snapshot(env), now = Date.now();
  const arr = await readHistory(env);
  if (arr.length && now - arr[arr.length - 1][0] < MIN_GAP_MS) return;
  arr.push([now, p.gold18PerGram, p.usdtToman, p.goldUsdtPerOunce]);
  await env.HISTORY.put(HIST_KEY, JSON.stringify(arr.slice(-MAX_POINTS)));
}

export default {
  async fetch(req, env) {
    const h = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const url = new URL(req.url);
    if (url.pathname.replace(/\/+$/, '').endsWith('/history')) {
      if (!env.HISTORY) return new Response(JSON.stringify({ error: 'history not configured' }), { status: 501, headers: h });
      const hours = Math.min(168, Math.max(1, parseInt(url.searchParams.get('hours'), 10) || 24));
      const from = Date.now() - hours * 3600000;
      const points = (await readHistory(env)).filter(p => p[0] >= from && p[1] > 0 && p[2] > 0 && p[3] > 0);
      return new Response(JSON.stringify({ hours, points }), { headers: { ...h, 'Cache-Control': 'public, max-age=60' } });
    }
    if (cache.body && Date.now() - cache.ts < TTL_MS) return new Response(cache.body, { headers: h });
    try {
      const p = await snapshot(env);
      cache = { ts: Date.now(), body: JSON.stringify({ ...p, ts: Date.now() }) };
      return new Response(cache.body, { headers: h });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: h });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(record(env).catch(e => console.error('record failed', e.message)));
  }
};
