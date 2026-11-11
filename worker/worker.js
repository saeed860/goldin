// Goldin price proxy (Cloudflare Workers, module syntax)
// Returns: {"gold18PerGram": <toman>, "usdtToman": <toman>, "ts": <ms>, "marketTs": <ms>}
//
// How the 18k price is built:
//   1) persiantoolbox.ir/api/market gives gold.pricePerGram (rial) and currencies.IRR.rate (rial per USD).
//      Their ratio is the international gold price in USD per gram (24k), so their own rial rate cancels out.
//   2) USDT/IRT comes from Nobitex's public market stats (rial, divided by 10 to get toman).
//   3) gold18 = USD per gram x 18/24 x USDT price in toman.
// This is the international price converted at the exchange rate. It does NOT include any
// domestic premium or discount, so compare it with a trusted local price board before real trading.
//
// Optional environment variables:
//   ALLOW_ORIGIN    your site's origin, e.g. "https://goldin.example" (default "*")
//   MARKET_API_URL  override the market endpoint (default https://persiantoolbox.ir/api/market)

const MARKET_URL = 'https://persiantoolbox.ir/api/market';
const NOBITEX_URL = 'https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls';
const TTL_MS = 30000;            // cache our own answer for 30 s
const MAX_AGE_MS = 10 * 60000;   // reject market data older than 10 min

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

export default {
  async fetch(req, env) {
    const h = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (cache.body && Date.now() - cache.ts < TTL_MS) return new Response(cache.body, { headers: h });
    try {
      const [usdt, g] = await Promise.all([getUsdt(), getGoldUsd(env)]);
      const gold18 = Math.round(g.usdPerGram24 * 0.75 * usdt);
      cache = {
        ts: Date.now(),
        body: JSON.stringify({ gold18PerGram: gold18, usdtToman: usdt, ts: Date.now(), marketTs: g.marketTs })
      };
      return new Response(cache.body, { headers: h });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: h });
    }
  }
};
