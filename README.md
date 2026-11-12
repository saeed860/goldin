# GOLDIN — Persian Gold Platform Starter

A responsive Persian RTL starter for a gold trading platform inspired by the broad UX patterns of modern gold/crypto services.
It is an independent implementation; it does not copy Tetalla's source code, text, branding, or assets.

## Product decisions (confirmed)
- Asset: 18-karat gold (750), traded by gram.
- Supply/custody: official treasury and supplier model.
- Customer options: account-based gold holding and physical delivery request.
- Revenue: buy/sell spread; any separate delivery or service charges must be disclosed independently.
See `ARCHITECTURE_18K_IR_FA.md` for the operating design.

## Included
- React + Vite frontend (Persian RTL, responsive, dark/gold visual system)
- Interactive gold/USDT calculator (demo values clearly marked)
- Express API starter
- Prisma schema for users, wallets, ledger entries, orders and audit logs
- Environment templates and implementation checklist

## Run locally

### Frontend
```bash
cd client
npm install
npm run dev
```

### Backend
```bash
cd server
npm install
cp .env.example .env
# configure PostgreSQL DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Frontend runs on http://localhost:5173 and API on http://localhost:4000.

## Important production boundary
This starter is NOT ready to hold funds or execute real trades. Demo prices and calculator values are illustrative.
Before production, implement and independently audit:
- KYC/AML and sanctions screening appropriate to the operating jurisdiction
- custody and wallet-provider integration; never store private keys in this app
- signed webhook verification and idempotent payment processing
- a double-entry ledger, reconciliation, withdrawal approvals and fraud controls
- market data sourcing, stale-price protection, spread/fee disclosure and trade execution
- rate limiting, MFA, secure session/cookie policy, secrets management, backups and monitoring
- legal review, licensing, consumer disclosures and tax treatment

Do not connect real payment rails or enable real-money transactions until these controls and approvals are complete.


## انتشار روی GitHub Pages
برای دستورالعمل انتشار نسخه نمایشی فرانت‌اند، فایل `GITHUB_PAGES_FA.md` را ببینید. GitHub Pages فقط پوشه `client` را build و منتشر می‌کند؛ backend باید جداگانه میزبانی شود.
