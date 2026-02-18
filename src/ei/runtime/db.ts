/**
 * Runtime DB helper for Next.js API routes.
 *
 * Creates a module-scoped PostgresStore so connections are reused across
 * warm Vercel invocations. Exports getEiRequestContext() which returns
 * a RequestContext with EI_DB_KEY already set to store.db.
 *
 * Usage in a Next.js route handler:
 *   const ctx = getEiRequestContext();
 *   const result = await someTool.execute(args, { requestContext: ctx });
 */

import { RequestContext } from '@mastra/core/request-context';
import { PostgresStore } from '@mastra/pg';
import { EI_DB_KEY } from './request-context';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Module-scoped: one pool per warm Lambda / Vercel function instance.
const store = new PostgresStore({
  id: 'ei-next-runtime',
  connectionString: process.env.DATABASE_URL,
});

export type EiContext = {
  [EI_DB_KEY]: PostgresStore['db'];
};

/**
 * Returns a fresh RequestContext with the Neon DB handle injected.
 * Call once per request; do not share across requests.
 */
export function getEiRequestContext(): RequestContext<EiContext> {
  const ctx = new RequestContext<EiContext>();
  ctx.set(EI_DB_KEY, store.db);
  return ctx;
}

/** Exported for use in migrate scripts or tests that need the raw store. */
export { store as eiStore };

export type EiDb = PostgresStore['db'];

/**
 * Type-safe helper to extract the DB handle from a tool/step execute context.
 * Use this in tool execute functions instead of manually calling requestContext.get().
 *
 * Usage:
 *   execute: async (input, context) => {
 *     const db = getEiDb(context);
 *     // db is typed as PostgresStore['db']
 *   }
 */
export function getEiDb(context: any): EiDb {
  const db = context?.requestContext?.get(EI_DB_KEY);
  if (!db) throw new Error('Missing eiDb in RequestContext');
  return db as EiDb;
}
