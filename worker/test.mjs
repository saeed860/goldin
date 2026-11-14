// تست با داده و KV ساختگی: node worker/test.mjs
import w from './worker.js';
const now = Date.now();
globalThis.fetch = async (u) => {
  if (u.includes('nobitex')) return { ok: true, json: async () => ({ stats: { 'usdt-rls': { latest: '2597500' } } }) };
  return { ok: true, json: async () => ({ ok: true, data: { timestamp: now, currencies: { IRR: { rate: 1827762.77 } }, gold: { pricePerGram: 236935432 } } }) };
};
const store = new Map();
const env = { HISTORY: { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } } };
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
let r = await w.fetch(new Request('https://x.dev/'), env), b = await r.json();
if (r.status !== 200 || !(b.gold18PerGram > 0) || b.usdtToman !== 259750 || !(b.goldUsdtPerOunce > 0)) fail('price');
const run = () => { const ps = []; return w.scheduled({}, env, { waitUntil: (p) => ps.push(p) }).then(() => Promise.all(ps)); };
await run(); await run(); // second run is skipped (too close)
r = await w.fetch(new Request('https://x.dev/history?hours=24'), env); b = await r.json();
if (b.points.length !== 1 || b.points[0].length !== 4) fail('history ' + JSON.stringify(b));
r = await w.fetch(new Request('https://x.dev/history'), {}); if (r.status !== 501) fail('no KV');
console.log('OK', b.points[0]);
