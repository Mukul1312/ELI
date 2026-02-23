/**
 * Raw SQL query helpers for ei_* tables.
 *
 * These are used by the Mastra tools (Phase 3) to read/write EI data.
 * They accept a DbClient (store.db) and return typed results.
 */

import type { PostgresStore } from '@mastra/pg';

type DbClient = PostgresStore['db'];

// ============================================================================
// ei_events queries
// ============================================================================

export interface StoredEventRow {
  id: string;
  student_id: string;
  event_type: string;
  topic_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: Date;
  created_at: Date;
}

export async function insertEvent(
  db: DbClient,
  studentId: string,
  eventType: string,
  topicId: string | null,
  payload: Record<string, unknown>,
  occurredAt?: Date,
  idempotencyKey?: string,
): Promise<StoredEventRow> {
  if (idempotencyKey) {
    const existing = await db.oneOrNone<{ event_id: string }>(
      'SELECT event_id FROM ei_idempotency_keys WHERE key = $1',
      [idempotencyKey],
    );
    if (existing) {
      const row = await db.oneOrNone<StoredEventRow>(
        'SELECT * FROM ei_events WHERE id = $1',
        [existing.event_id],
      );
      if (row) return row;
    }
  }

  const row = await db.one(
    `INSERT INTO ei_events (student_id, event_type, topic_id, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [studentId, eventType, topicId, JSON.stringify(payload), occurredAt ?? new Date()],
  );

  if (idempotencyKey) {
    await db.none(
      'INSERT INTO ei_idempotency_keys (key, event_id) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [idempotencyKey, row.id],
    );
  }

  return row;
}

export interface EventQueryFilters {
  eventTypes?: string[];
  topicId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

export async function queryEvents(
  db: DbClient,
  studentId: string,
  filters?: EventQueryFilters,
): Promise<StoredEventRow[]> {
  const conditions: string[] = ['student_id = $1'];
  const params: unknown[] = [studentId];
  let idx = 2;

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    conditions.push(`event_type = ANY($${idx})`);
    params.push(filters.eventTypes);
    idx++;
  }
  if (filters?.topicId) {
    conditions.push(`topic_id = $${idx}`);
    params.push(filters.topicId);
    idx++;
  }
  if (filters?.since) {
    conditions.push(`occurred_at >= $${idx}`);
    params.push(filters.since);
    idx++;
  }
  if (filters?.until) {
    conditions.push(`occurred_at <= $${idx}`);
    params.push(filters.until);
    idx++;
  }

  const where = conditions.join(' AND ');
  const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : '';

  return db.any(
    `SELECT * FROM ei_events WHERE ${where} ORDER BY occurred_at DESC ${limitClause}`,
    params,
  );
}

/** Per-topic event counts in the last 7 days for SA efficiency diagnosis. */
export interface TopicEventCounts7d {
  topicId: string;
  effortCount7d: number;
  retrievalCount7d: number;
}

export async function getTopicEventCounts7d(
  db: DbClient,
  studentId: string,
  since: Date,
): Promise<TopicEventCounts7d[]> {
  const rows = await queryEvents(db, studentId, {
    eventTypes: ['SessionEnd', 'RetrievalVerified'],
    since,
  });
  const byTopic = new Map<string, { effort: number; retrieval: number }>();
  for (const row of rows) {
    const topicId = row.topic_id ?? 'default-topic';
    const entry = byTopic.get(topicId) ?? { effort: 0, retrieval: 0 };
    if (row.event_type === 'SessionEnd') entry.effort++;
    else if (row.event_type === 'RetrievalVerified') entry.retrieval++;
    byTopic.set(topicId, entry);
  }
  return Array.from(byTopic.entries()).map(([topicId, { effort, retrieval }]) => ({
    topicId,
    effortCount7d: effort,
    retrievalCount7d: retrieval,
  }));
}

// ============================================================================
// ei_topic_state queries
// ============================================================================

export interface TopicStateRow {
  student_id: string;
  topic_id: string;
  topic_step: string | null;
  last_effort_at: Date | null;
  last_retrieval_at: Date | null;
  last_scheduled_due_at: Date | null;
  tms: number;
  delta_decay: number;
  updated_at: Date;
}

export async function getTopicState(
  db: DbClient,
  studentId: string,
  topicId: string,
): Promise<TopicStateRow | null> {
  return db.oneOrNone(
    'SELECT * FROM ei_topic_state WHERE student_id = $1 AND topic_id = $2',
    [studentId, topicId],
  );
}

export async function getAllTopicStates(
  db: DbClient,
  studentId: string,
): Promise<TopicStateRow[]> {
  return db.any(
    'SELECT * FROM ei_topic_state WHERE student_id = $1 ORDER BY updated_at DESC',
    [studentId],
  );
}

export async function upsertTopicState(
  db: DbClient,
  studentId: string,
  topicId: string,
  updates: Partial<Pick<TopicStateRow, 'last_effort_at' | 'last_retrieval_at' | 'last_scheduled_due_at' | 'tms' | 'delta_decay' | 'topic_step'>>,
): Promise<TopicStateRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [studentId, topicId];
  let idx = 3;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update, just ensure the row exists
    return db.one(
      `INSERT INTO ei_topic_state (student_id, topic_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, topic_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [studentId, topicId],
    );
  }

  const setClause = setClauses.join(', ');
  return db.one(
    `INSERT INTO ei_topic_state (student_id, topic_id, ${Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined).join(', ')})
     VALUES ($1, $2, ${Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined).map((_, i) => `$${i + 3}`).join(', ')})
     ON CONFLICT (student_id, topic_id) DO UPDATE SET ${setClause}, updated_at = NOW()
     RETURNING *`,
    params,
  );
}

// ============================================================================
// ei_student_aggregates queries
// ============================================================================

export interface AggregatesRow {
  student_id: string;
  pending_checks: number;
  open_loops: number;
  verification_rate_7d: number;
  schedule_misses_7d: number;
  avoidant_exits_7d: number;
  skip_count_7d: number;
  silence_days: number;
  start_latency_min_median_7d: number | null;
  intent_acceptance_rate_7d: number | null;
  replan_loop_count_7d: number;
  state_trend_7d: string;
  loop_latency_trend: string | null;
  updated_at: Date;
}

export async function getAggregates(
  db: DbClient,
  studentId: string,
): Promise<AggregatesRow | null> {
  return db.oneOrNone(
    'SELECT * FROM ei_student_aggregates WHERE student_id = $1',
    [studentId],
  );
}

export async function upsertAggregates(
  db: DbClient,
  studentId: string,
  data: Omit<AggregatesRow, 'student_id' | 'updated_at'>,
): Promise<AggregatesRow> {
  return db.one(
    `INSERT INTO ei_student_aggregates (
       student_id, pending_checks, open_loops, verification_rate_7d,
       schedule_misses_7d, avoidant_exits_7d, skip_count_7d, silence_days,
       start_latency_min_median_7d, intent_acceptance_rate_7d, replan_loop_count_7d,
       state_trend_7d, loop_latency_trend
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (student_id) DO UPDATE SET
       pending_checks = $2, open_loops = $3, verification_rate_7d = $4,
       schedule_misses_7d = $5, avoidant_exits_7d = $6, skip_count_7d = $7,
       silence_days = $8, start_latency_min_median_7d = $9,
       intent_acceptance_rate_7d = $10, replan_loop_count_7d = $11,
       state_trend_7d = $12, loop_latency_trend = $13, updated_at = NOW()
     RETURNING *`,
    [
      studentId, data.pending_checks, data.open_loops, data.verification_rate_7d,
      data.schedule_misses_7d, data.avoidant_exits_7d, data.skip_count_7d,
      data.silence_days, data.start_latency_min_median_7d,
      data.intent_acceptance_rate_7d, data.replan_loop_count_7d,
      data.state_trend_7d, data.loop_latency_trend,
    ],
  );
}

// ============================================================================
// ei_student_policy queries
// ============================================================================

export interface PolicyRow {
  student_id: string;
  tightness_level: string;
  adjustment_mode: string | null;
  dials: Record<string, unknown>;
  constraints: Record<string, unknown>;
  updated_at: Date;
}

export async function getPolicy(
  db: DbClient,
  studentId: string,
): Promise<PolicyRow | null> {
  return db.oneOrNone(
    'SELECT * FROM ei_student_policy WHERE student_id = $1',
    [studentId],
  );
}

export async function upsertPolicy(
  db: DbClient,
  studentId: string,
  tightnessLevel: string,
  adjustmentMode: string | null,
  dials: Record<string, unknown>,
  constraints: Record<string, unknown>,
): Promise<PolicyRow> {
  return db.one(
    `INSERT INTO ei_student_policy (student_id, tightness_level, adjustment_mode, dials, constraints)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id) DO UPDATE SET
       tightness_level = $2, adjustment_mode = $3, dials = $4, constraints = $5, updated_at = NOW()
     RETURNING *`,
    [studentId, tightnessLevel, adjustmentMode, JSON.stringify(dials), JSON.stringify(constraints)],
  );
}

// ============================================================================
// ei_radar_alerts queries
// ============================================================================

export interface RadarAlertRow {
  id: string;
  student_id: string;
  batch_id: string;
  alert_type: string;
  severity: string;
  evidence_summary: Record<string, unknown>;
  recommended_action: string;
  last_updated_at: Date;
}

export async function upsertRadarAlert(
  db: DbClient,
  studentId: string,
  batchId: string,
  alertType: string,
  severity: string,
  evidenceSummary: Record<string, unknown>,
  recommendedAction: string,
): Promise<{ row: RadarAlertRow; isNew: boolean }> {
  const existing = await db.oneOrNone(
    'SELECT * FROM ei_radar_alerts WHERE student_id = $1 AND alert_type = $2',
    [studentId, alertType],
  );

  if (existing && existing.severity === severity) {
    // Deduplicate: same severity -> update evidence if different
    const updated = await db.one(
      `UPDATE ei_radar_alerts SET
         batch_id = $1, evidence_summary = $2, recommended_action = $3, last_updated_at = NOW()
       WHERE student_id = $4 AND alert_type = $5
       RETURNING *`,
      [batchId, JSON.stringify(evidenceSummary), recommendedAction, studentId, alertType],
    );
    return { row: updated, isNew: false };
  }

  const row = await db.one(
    `INSERT INTO ei_radar_alerts (student_id, batch_id, alert_type, severity, evidence_summary, recommended_action)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id, alert_type) DO UPDATE SET
       batch_id = $2, severity = $4, evidence_summary = $5, recommended_action = $6, last_updated_at = NOW()
     RETURNING *`,
    [studentId, batchId, alertType, severity, JSON.stringify(evidenceSummary), recommendedAction],
  );

  return { row, isNew: !existing };
}

export interface RadarAlertFilters {
  studentId?: string;
  alertType?: string;
  severity?: string;
  batchId?: string;
}

export async function getRadarAlerts(
  db: DbClient,
  filters?: RadarAlertFilters,
  limit = 100,
  offset = 0,
): Promise<{ alerts: RadarAlertRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.studentId) {
    conditions.push(`student_id = $${idx}`);
    params.push(filters.studentId);
    idx++;
  }
  if (filters?.alertType) {
    conditions.push(`alert_type = $${idx}`);
    params.push(filters.alertType);
    idx++;
  }
  if (filters?.severity) {
    conditions.push(`severity = $${idx}`);
    params.push(filters.severity);
    idx++;
  }
  if (filters?.batchId) {
    conditions.push(`batch_id = $${idx}`);
    params.push(filters.batchId);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.one(
    `SELECT COUNT(*) as total FROM ei_radar_alerts ${where}`,
    params,
  );

  const alerts = await db.any(
    `SELECT * FROM ei_radar_alerts ${where} ORDER BY last_updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return { alerts, total: Number(countResult.total) };
}

// ============================================================================
// Utility: list distinct active students
// ============================================================================

export async function listActiveStudents(
  db: DbClient,
  activeWithinDays = 30,
): Promise<string[]> {
  const since = new Date(Date.now() - activeWithinDays * 24 * 60 * 60 * 1000);
  const rows = await db.any(
    `SELECT DISTINCT student_id FROM ei_events WHERE occurred_at >= $1 ORDER BY student_id`,
    [since],
  );
  return rows.map((r: { student_id: string }) => r.student_id);
}
