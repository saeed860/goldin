// تست با داده و KV ساختگی: node worker/test.mjs
import w from './worker.js';
const now = Date.now();
globalThis.fetch = async (u) => {
  if (u.includes('x.example/usdt')) return { ok: true, json: async () => ({ data: { price: '2597000' } }) };
  if (globalThis.nobitexDown && u.includes('nobitex')) return { ok: false, status: 530 };
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
// Nobitex unreachable (530): custom source takes over; without it the error names both
globalThis.nobitexDown = true;
const kv2 = new Map(), env2 = { HISTORY: { get: async (k) => kv2.get(k) ?? null, put: async (k, v) => { kv2.set(k, v); } }, USDT_API_URL: 'https://x.example/usdt', USDT_JSON_PATH: 'data.price', USDT_DIVISOR: '10' };
const ps = []; await w.scheduled({}, env2, { waitUntil: (p) => ps.push(p) }); await Promise.all(ps);
const pt = JSON.parse(kv2.get('h'))[0]; if (pt[2] !== 259700) fail('custom usdt ' + pt);
const kv3 = new Map(), errs = []; const oe = console.error; console.error = (...a) => errs.push(a.join(' '));
const ps3 = []; await w.scheduled({}, { HISTORY: { get: async () => null, put: async (k, v) => kv3.set(k, v) } }, { waitUntil: (p) => ps3.push(p) }); await Promise.all(ps3);
console.error = oe; if (kv3.size || !/nobitex: status 530/.test(errs.join())) fail('error msg ' + errs);
console.log('OK', b.points[0]);
