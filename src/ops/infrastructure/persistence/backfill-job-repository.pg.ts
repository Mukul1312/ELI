/**
 * PostgresBackfillJobRepository — implements IBackfillJobRepository.
 * Persists BackfillJob state to ops_backfill_jobs.
 */

import type { EiDb } from '@/ei/runtime/db';
import type {
  IBackfillJobRepository,
  BackfillJobSnapshot,
  BackfillCheckpoint,
  UpdateProgressOptions,
} from '@/ops/application/start-backfill-job/port';

interface BackfillJobRow {
  id: string;
  status: string;
  projection_names: string[];
  student_ids: string[];
  throttle_ops_per_sec: number | null;
  projection_version: string | null;
  total_units: number | null;
  completed_units: number;
  checkpoint_payload: unknown;
  error_message: string | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

function rowToSnapshot(row: BackfillJobRow): BackfillJobSnapshot {
  return {
    id: row.id,
    status: row.status as BackfillJobSnapshot['status'],
    projectionNames: row.projection_names,
    studentIds: row.student_ids,
    throttleOpsPerSec: row.throttle_ops_per_sec,
    projectionVersion: row.projection_version,
    totalUnits: row.total_units,
    completedUnits: row.completed_units,
    checkpointPayload: (row.checkpoint_payload as BackfillCheckpoint) ?? null,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresBackfillJobRepository implements IBackfillJobRepository {
  constructor(private readonly db: EiDb) {}

  async save(job: BackfillJobSnapshot): Promise<void> {
    await this.db.none(
      `INSERT INTO ops_backfill_jobs (
        id, status, projection_names, student_ids, throttle_ops_per_sec,
        projection_version, total_units, completed_units, checkpoint_payload,
        error_message, created_at, started_at, completed_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        job.id,
        job.status,
        job.projectionNames,
        job.studentIds,
        job.throttleOpsPerSec,
        job.projectionVersion,
        job.totalUnits,
        job.completedUnits,
        job.checkpointPayload ? JSON.stringify(job.checkpointPayload) : null,
        job.errorMessage,
        job.createdAt,
        job.startedAt,
        job.completedAt,
        job.updatedAt,
      ],
    );
  }

  async getById(jobId: string): Promise<BackfillJobSnapshot | null> {
    const row = await this.db.oneOrNone<BackfillJobRow>(
      'SELECT * FROM ops_backfill_jobs WHERE id = $1',
      [jobId],
    );
    return row ? rowToSnapshot(row) : null;
  }

  async updateProgress(jobId: string, opts: UpdateProgressOptions): Promise<void> {
    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.status != null) {
      updates.push(`status = $${idx}`);
      params.push(opts.status);
      idx++;
    }
    if (opts.completedUnits != null) {
      updates.push(`completed_units = $${idx}`);
      params.push(opts.completedUnits);
      idx++;
    }
    if (opts.checkpointPayload !== undefined) {
      updates.push(`checkpoint_payload = $${idx}`);
      params.push(opts.checkpointPayload ? JSON.stringify(opts.checkpointPayload) : null);
      idx++;
    }
    if (opts.errorMessage !== undefined) {
      updates.push(`error_message = $${idx}`);
      params.push(opts.errorMessage);
      idx++;
    }
    if (opts.completedAt !== undefined) {
      updates.push(`completed_at = $${idx}`);
      params.push(opts.completedAt);
      idx++;
    }
    if (opts.startedAt !== undefined) {
      updates.push(`started_at = $${idx}`);
      params.push(opts.startedAt);
      idx++;
    }

    params.push(jobId);
    await this.db.none(
      `UPDATE ops_backfill_jobs SET ${updates.join(', ')} WHERE id = $${idx}`,
      params,
    );
  }

  async findResumable(olderThan: Date): Promise<BackfillJobSnapshot[]> {
    const rows = await this.db.any<BackfillJobRow>(
      `SELECT * FROM ops_backfill_jobs
       WHERE status IN ('queued', 'running') AND updated_at < $1
       ORDER BY created_at ASC`,
      [olderThan],
    );
    return rows.map(rowToSnapshot);
  }

  async findNextQueuedOrRunning(): Promise<BackfillJobSnapshot | null> {
    const row = await this.db.oneOrNone<BackfillJobRow>(
      `SELECT * FROM ops_backfill_jobs
       WHERE status IN ('queued', 'running')
       ORDER BY created_at ASC
       LIMIT 1`,
    );
    return row ? rowToSnapshot(row) : null;
  }
}
