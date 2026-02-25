# Neon Database Branching for Integration Tests

This guide describes using [Neon.tech](https://neon.tech)'s database branching feature for isolated integration test environments.

## Benefits

- **Isolated test environments** — Each test run gets its own branch
- **No test data contamination** — Branches are fresh; no cleanup races between runs
- **Fast create/delete** — Branches are copy-on-write; creation and cleanup are quick
- **CI/CD friendly** — No shared state; parallel jobs stay isolated

## Setup

### Environment variables

| Variable         | Required | Description                                                                              |
|------------------|----------|------------------------------------------------------------------------------------------|
| `NEON_API_KEY`   | Yes*     | API key from [Neon Console → Settings → API Keys] (or use `NEON_TOKEN`)                  |
| `NEON_TOKEN`     | Yes*     | Alternative to `NEON_API_KEY` (article convention)                                       |
| `NEON_PROJECT_ID`| Yes*     | Project ID from Neon Console (e.g. `hidden-river-50598307`)                              |
| `NEON_BRANCH_ID` | No       | When set, tests use this existing branch (no create/delete); when unset, create per run  |

\* Either `NEON_API_KEY` or `NEON_TOKEN` is required for Neon branching mode. Alternatively, use `DATABASE_URL` for a direct connection.

### API key scope

Use a **Project-scoped** API key for tests — it limits access to one project and cannot delete the project. Create it in Neon Console → Settings → API Keys.

## Usage

### Option A: Use shared setup (recommended)

Tests that use `setupDbForTests()` automatically use Neon branching when `NEON_API_KEY` or `NEON_TOKEN` (plus `NEON_PROJECT_ID`) are set. If `NEON_BRANCH_ID` is set, that existing branch is used; otherwise a new branch is created per run and deleted in cleanup.

```ts
import { setupDbForTests } from '@/test/db-test-setup';
import { canUseNeonBranching } from '@/test/neon-postgres';

const shouldRun = !!process.env.DATABASE_URL || canUseNeonBranching();

describe.skipIf(!shouldRun)('MyIntegrationTest', () => {
  let store: PostgresStore;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await setupDbForTests('my-suite-id');
    store = setup.store;
    cleanup = setup.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  // ... tests
});
```

### Option B: Direct NeonPostgres usage

**Create branch per run (article-style):**

```ts
import { NeonPostgres } from '@/test/neon-postgres';
import { Pool } from 'pg'; // or PostgresStore from @mastra/pg

const neon = new NeonPostgres({
  apiKey: process.env.NEON_API_KEY ?? process.env.NEON_TOKEN!,
  projectId: process.env.NEON_PROJECT_ID!,
});

await neon.createTestBranch();
const pool = new Pool({ connectionString: neon.connString! });

// run migrations, then tests...

await pool.end();
await neon.deleteBranch(); // no argument — uses instance state
```

**Use existing branch:** Set `NEON_BRANCH_ID`, then:

```ts
await neonDb.useExistingBranch(process.env.NEON_BRANCH_ID!);
const pool = new Pool({ connectionString: neonDb.connString! });
// run tests...
await pool.end();
// do not call deleteBranch() — branch is long-lived
```

## Migration

When using Neon branching, `setupDbForTests()` runs `runMigration(connString)` automatically before tests. The migration creates all EI and CohortAccess tables on the new branch.

## References

- [Neon Branching with the API](https://neon.tech/docs/guides/branching-neon-api)
- [Karan Sakhuja — Guide to using Neon.tech Postgres for unit testing](https://medium.com/@karansakhuja)
