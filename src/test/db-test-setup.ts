/**
 * Shared setup for integration tests that need a Postgres database.
 *
 * Supports three modes:
 * 1. Neon + existing branch: When NEON_BRANCH_ID is set, uses that branch (no create/delete).
 * 2. Neon branching: When NEON_API_KEY/NEON_TOKEN + NEON_PROJECT_ID are set, creates a fresh branch and deletes after.
 * 3. DATABASE_URL: Uses the provided connection string (e.g. for local dev or CI).
 *
 * Usage:
 *   const { store, connectionString, cleanup } = await setupDbForTests('my-test-suite');
 *   // use store.db or connectionString...
 *   afterAll(cleanup);
 */

import 'dotenv/config';
import { PostgresStore } from '@mastra/pg';
import { runMigration } from '../ei/db/migrate';
import {
  NeonPostgres,
  canUseNeonBranching,
  useExistingNeonBranch,
} from './neon-postgres';

export interface DbTestSetupResult {
  store: PostgresStore;
  connectionString: string;
  /** Call in afterAll to close store and delete branch (if create-branch mode) */
  cleanup: () => Promise<void>;
}

export async function setupDbForTests(suiteId: string): Promise<DbTestSetupResult> {
  if (canUseNeonBranching()) {
    const neon = new NeonPostgres({
      apiKey: process.env.NEON_API_KEY ?? process.env.NEON_TOKEN!,
      projectId: process.env.NEON_PROJECT_ID!,
    });

    let connString: string;
    if (useExistingNeonBranch()) {
      const result = await neon.useExistingBranch(process.env.NEON_BRANCH_ID!);
      connString = result.connString;
    } else {
      const result = await neon.createTestBranch();
      connString = result.connString;
    }

    await runMigration(connString);

    const store = new PostgresStore({
      id: `ei-test-${suiteId}`,
      connectionString: connString,
    });

    return {
      store,
      connectionString: connString,
      cleanup: async () => {
        await store.close?.();
        if (!useExistingNeonBranch()) {
          await neon.deleteBranch();
        }
      },
    };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL or (NEON_API_KEY/NEON_TOKEN + NEON_PROJECT_ID) required for integration tests'
    );
  }

  const store = new PostgresStore({
    id: `ei-test-${suiteId}`,
    connectionString,
  });

  return {
    store,
    connectionString,
    cleanup: async () => {
      await store.close?.();
    },
  };
}
