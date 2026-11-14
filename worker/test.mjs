// تست ساده با دادهٔ ساختگی: node worker/test.mjs
import w from './worker.js';
const now = Date.now();
globalThis.fetch = async (u) => {
  if (u.includes('nobitex')) return { ok: true, json: async () => ({ stats: { 'usdt-rls': { latest: '2597500' } } }) };
  return { ok: true, json: async () => ({ ok: true, data: { timestamp: now, currencies: { IRR: { rate: 1827762.77 } }, gold: { pricePerGram: 236935432 } } }) };
};
const r = await w.fetch({ method: 'GET' }, {});
const b = await r.json();
console.log(r.status, b);
if (r.status !== 200 || !(b.gold18PerGram > 0) || b.usdtToman !== 259750) { console.error('FAIL'); process.exit(1); }
console.log('OK');
