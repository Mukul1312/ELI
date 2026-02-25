/**
 * Drop all app tables in Neon (and any Postgres with DATABASE_URL), then run migration.
 *
 * Use when you want a clean schema (e.g. after changing migrations or resetting dev data).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx src/ei/db/reset-and-migrate.ts
 *   or: npm run migrate:reset
 */

import 'dotenv/config';
import { PostgresStore } from '@mastra/pg';
import { runMigration } from './migrate';

/** Tables in dependency order: drop children first (those with FKs), then parents. */
const TABLES_TO_DROP = [
  'roles',
  'student_cohort_membership',
  'students',
  'cohorts',
  'institutes',
  'ei_radar_alerts',
  'ei_study_sessions',
  'ei_student_policy',
  'ei_student_aggregates',
  'ei_topic_state',
  'ei_idempotency_keys',
  'ei_events',
];

export async function dropAllTables(connectionString: string): Promise<void> {
  const store = new PostgresStore({
    id: 'ei-reset',
    connectionString,
  });
  try {
    for (const table of TABLES_TO_DROP) {
      await store.db.none(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped table (if existed): ${table}`);
    }
  } finally {
    await store.close();
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('Dropping all app tables...');
  await dropAllTables(connectionString);
  console.log('Running migration...');
  await runMigration(connectionString);
  console.log('Reset and migration complete.');
}

main().catch((err) => {
  console.error('Reset/migration failed:', err);
  process.exit(1);
});