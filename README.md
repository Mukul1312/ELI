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

## Integration tests

Integration tests need a Postgres connection. Two options:

**1. DATABASE_URL** — Use an existing connection string (local or CI).

**2. Neon branching** — Create isolated test branches per run (or use an existing branch). Set:
- `NEON_API_KEY` or `NEON_TOKEN` — [Create in Neon Console](https://console.neon.tech/app/settings/api-keys)
- `NEON_PROJECT_ID` — From project Settings in Neon Console (e.g. `hidden-river-50598307`)
- `NEON_BRANCH_ID` (optional) — When set, uses this existing branch (no create/delete)

Benefits: no test data contamination, fresh schema per run, ideal for CI/CD. See [docs/testing-neon-branching.md](docs/testing-neon-branching.md).
