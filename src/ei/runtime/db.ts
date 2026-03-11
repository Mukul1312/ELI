/**
 * Runtime DB helper for Next.js API routes.
 *
 * Creates a module-scoped PostgresStore so connections are reused across
 * warm Vercel invocations.
 */

import { PostgresStore } from '@mastra/pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Module-scoped: one pool per warm Lambda / Vercel function instance.
const store = new PostgresStore({
  id: 'ei-next-runtime',
  connectionString: process.env.DATABASE_URL,
});

/** Exported for use in migrate scripts, tests, tools, and workflows. */
export { store as eiStore };

export type EiDb = PostgresStore['db'];

/**
 * Returns the request-scoped traced DB if available, otherwise the raw store.db.
 * Workflows and query code should prefer this over eiStore.db directly.
 *
 * Per ops-observability-tactical-spec.md §8 (Phase 3):
 * tracing is transparent — callers don't import tracing, just call getDb().
 */
import { getRequestDb } from '@/ops/infrastructure/tracing/request-context';

export function getDb(): EiDb {
  return getRequestDb(store.db);
}
