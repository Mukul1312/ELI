/**
 * EmitScheduleMissedHandler — finds past-due scheduled verifications and appends ScheduleMissed.
 *
 * Per event catalog: producer = System/Projection. Cron-triggered.
 * Idempotency key: schedule-missed:{studentId}:{topicId}:{dueAt} to avoid duplicates.
 */

import { eiStore } from '../../runtime/db';
import { getPastDueScheduledTopicStates } from '../../db/queries';
import { insertEvent } from '../../db/queries';

export interface EmitScheduleMissedResult {
  emitted: number;
  skipped: number;
}

export async function emitScheduleMissed(): Promise<EmitScheduleMissedResult> {
  const db = eiStore.db;
  const now = new Date();

  const rows = await getPastDueScheduledTopicStates(db, now);
  let emitted = 0;
  let skipped = 0;

  for (const row of rows) {
    const dueAt = row.last_scheduled_due_at!;
    const idempotencyKey = `schedule-missed:${row.student_id}:${row.topic_id}:${dueAt.toISOString()}`;

    try {
      await insertEvent(
        db,
        row.student_id,
        'ScheduleMissed',
        row.topic_id,
        {
          studentId: row.student_id,
          topic: row.topic_id,
          missedAt: now.toISOString(),
        },
        now,
        idempotencyKey,
      );
      emitted++;
    } catch {
      skipped++;
    }
  }

  return { emitted, skipped };
}
