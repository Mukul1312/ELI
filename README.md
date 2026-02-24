# AI Study Brother (EI)

Next.js + Mastra + Neon stack for the Execution Intelligence (EI) coaching system.

## Docs

- **[Launch Requirements Checklist (P0 + P1)](docs/launch-requirements-checklist.md)** — Production launch requirements for 500 students (Vercel, Neon Auth, cohorts, idempotency, async-lite jobs, sponsor/coupon model).

## Scripts

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run test` — Run Vitest
- `npm run migrate` — Run DB migrations (`tsx src/ei/db/migrate.ts`)
