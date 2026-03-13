import type { CurriculumCatalogDb } from './db-types';
import type { INormalizationQueueRepository } from '../../domain/normalization-queue-repository';
import { NormalizationQueueEntry } from '../../domain/normalization-queue-entry';

interface QueueRow {
  id: string;
  raw_text: string;
  student_id: string;
  occurred_at: Date;
  status: 'pending' | 'resolved';
  resolved_topic_id: string | null;
  resolved_alias: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
  created_at: Date;
}

function rowToEntity(row: QueueRow): NormalizationQueueEntry {
  return NormalizationQueueEntry.reconstitute({
    id: row.id,
    rawText: row.raw_text,
    studentId: row.student_id,
    occurredAt: row.occurred_at,
    status: row.status,
    resolvedTopicId: row.resolved_topic_id,
    resolvedAlias: row.resolved_alias,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
  });
}

export class PostgresNormalizationQueueRepository implements INormalizationQueueRepository {
  constructor(private readonly db: CurriculumCatalogDb) {}

  async append(entry: NormalizationQueueEntry): Promise<void> {
    const p = entry.toProps();
    await this.db.none(
      `INSERT INTO topic_normalization_queue (id, raw_text, student_id, occurred_at, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.id, p.rawText, p.studentId, p.occurredAt, p.status, p.createdAt],
    );
  }

  async findById(id: string): Promise<NormalizationQueueEntry | null> {
    const row = await this.db.oneOrNone<QueueRow>(
      'SELECT * FROM topic_normalization_queue WHERE id = $1',
      [id],
    );
    return row ? rowToEntity(row) : null;
  }

  async save(entry: NormalizationQueueEntry): Promise<void> {
    const p = entry.toProps();
    await this.db.none(
      `UPDATE topic_normalization_queue
       SET status = $2, resolved_topic_id = $3, resolved_alias = $4, resolved_at = $5, resolved_by = $6
       WHERE id = $1`,
      [p.id, p.status, p.resolvedTopicId, p.resolvedAlias, p.resolvedAt, p.resolvedBy],
    );
  }

  async listPending(limit = 50): Promise<NormalizationQueueEntry[]> {
    const rows = await this.db.many<QueueRow>(
      `SELECT * FROM topic_normalization_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToEntity);
  }
}
