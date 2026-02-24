/**
 * Database migration script for EI custom tables.
 *
 * Creates 5 tables alongside Mastra's built-in tables:
 * 1. ei_events       -- append-only event log
 * 2. ei_topic_state  -- per student/topic state
 * 3. ei_student_aggregates -- recomputed derived signals
 * 4. ei_student_policy     -- SA dials + tightness level
 * 5. ei_radar_alerts       -- institute-facing alerts (privacy boundary)
 *
 * Usage:
 *   npx tsx src/ei/db/migrate.ts
 *   or: npm run migrate
 */

import 'dotenv/config';
import { PostgresStore } from '@mastra/pg';

const SQL_STATEMENTS = [
  // ================================================================
  // 1. ei_events (append-only event log)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    topic_id        TEXT,
    payload         JSONB NOT NULL DEFAULT '{}',
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ei_events_student_occurred
   ON ei_events (student_id, occurred_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_ei_events_student_type_occurred
   ON ei_events (student_id, event_type, occurred_at DESC)`,

  // ================================================================
  // 1b. ei_idempotency_keys (for Ledger append retry safety)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_idempotency_keys (
    key         TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ================================================================
  // 2. ei_topic_state (per student + topic, upserted)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_topic_state (
    student_id          TEXT NOT NULL,
    topic_id            TEXT NOT NULL,
    topic_step          TEXT,
    last_effort_at      TIMESTAMPTZ,
    last_retrieval_at   TIMESTAMPTZ,
    last_scheduled_due_at TIMESTAMPTZ,
    tms                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    delta_decay         DOUBLE PRECISION NOT NULL DEFAULT 0,
    effort_count_7d     INTEGER NOT NULL DEFAULT 0,
    retrieval_count_7d  INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, topic_id)
  )`,

  // Backfill columns for existing DBs (no-op if already present)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ei_topic_state' AND column_name = 'effort_count_7d') THEN
      ALTER TABLE ei_topic_state ADD COLUMN effort_count_7d INTEGER NOT NULL DEFAULT 0;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ei_topic_state' AND column_name = 'retrieval_count_7d') THEN
      ALTER TABLE ei_topic_state ADD COLUMN retrieval_count_7d INTEGER NOT NULL DEFAULT 0;
    END IF;
  END $$`,

  // ================================================================
  // 3. ei_student_aggregates (per student, recomputed)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_student_aggregates (
    student_id                  TEXT PRIMARY KEY,
    pending_checks              INTEGER NOT NULL DEFAULT 0,
    open_loops                  INTEGER NOT NULL DEFAULT 0,
    verification_rate_7d        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    schedule_misses_7d          INTEGER NOT NULL DEFAULT 0,
    avoidant_exits_7d           INTEGER NOT NULL DEFAULT 0,
    skip_count_7d               INTEGER NOT NULL DEFAULT 0,
    silence_days                INTEGER NOT NULL DEFAULT 0,
    start_latency_min_median_7d DOUBLE PRECISION,
    intent_acceptance_rate_7d   DOUBLE PRECISION,
    replan_loop_count_7d        INTEGER NOT NULL DEFAULT 0,
    state_trend_7d              TEXT NOT NULL DEFAULT 'flat',
    loop_latency_trend          TEXT,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ================================================================
  // 4. ei_student_policy (per student, written by SA)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_student_policy (
    student_id      TEXT PRIMARY KEY,
    tightness_level TEXT NOT NULL DEFAULT 'Normal',
    adjustment_mode TEXT,
    dials           JSONB NOT NULL DEFAULT '{}',
    constraints     JSONB NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ================================================================
  // 5. ei_radar_alerts (institute-facing, privacy boundary)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_radar_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          TEXT NOT NULL,
    batch_id            TEXT NOT NULL,
    alert_type          TEXT NOT NULL,
    severity            TEXT NOT NULL,
    evidence_summary    JSONB NOT NULL DEFAULT '{}',
    recommended_action  TEXT NOT NULL DEFAULT '',
    last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ei_radar_alerts_student
   ON ei_radar_alerts (student_id, last_updated_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_ei_radar_alerts_batch
   ON ei_radar_alerts (batch_id)`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_ei_radar_alerts_student_type
   ON ei_radar_alerts (student_id, alert_type)`,

  // ================================================================
  // 5b. ei_study_sessions (concurrency safety, phase derivation)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS ei_study_sessions (
    id                    TEXT PRIMARY KEY,
    student_id            TEXT NOT NULL,
    topic_id              TEXT NOT NULL,
    status                TEXT NOT NULL CHECK (status IN ('negotiating','activating','active','verifying','closed')),
    negotiated_intent_id  TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_ei_study_sessions_active_per_topic
   ON ei_study_sessions (student_id, topic_id) WHERE status IN ('negotiating','activating','active')`,

  // ================================================================
  // 6. CohortAccess tables (institutes, cohorts, students, membership, roles)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS institutes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cohorts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id    UUID NOT NULL REFERENCES institutes(id),
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    TEXT NOT NULL UNIQUE,
    institute_id    UUID REFERENCES institutes(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS student_cohort_membership (
    student_id      UUID PRIMARY KEY REFERENCES students(id),
    cohort_id       UUID REFERENCES cohorts(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS roles (
    student_id      UUID PRIMARY KEY REFERENCES students(id),
    role            TEXT NOT NULL CHECK (role IN ('student', 'admin', 'institute')),
    scope           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const store = new PostgresStore({
    id: 'ei-migration',
    connectionString,
  });

  console.log('Running EI database migration...');

  try {
    for (const sql of SQL_STATEMENTS) {
      const firstLine = sql.trim().split('\n')[0].substring(0, 60);
      console.log(`  Executing: ${firstLine}...`);
      await store.db.none(sql);
    }
    console.log('Migration complete. All EI tables (including ei_idempotency_keys) and CohortAccess tables created/verified.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await store.close();
  }
}

migrate();
