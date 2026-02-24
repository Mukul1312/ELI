import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import type {
  IStrategicAdjustmentDecisionEventReader,
  StoredStrategicAdjustmentDecision,
} from '../../application/apply-strategic-adjustment-decision/port';

type DbClient = PostgresStore['db'];

export class PostgresStrategicAdjustmentDecisionEventReader
  implements IStrategicAdjustmentDecisionEventReader
{
  constructor(private readonly db: DbClient) {}

  async readLatestDecision(
    studentId: string,
  ): Promise<StoredStrategicAdjustmentDecision | null> {
    const rows = await Q.queryEvents(this.db, studentId, {
      eventTypes: ['StrategicAdjustmentDecision'],
      limit: 1,
    });
    if (rows.length === 0) {
      return null;
    }
    const payload = rows[0].payload as Record<string, unknown>;
    const dials = (payload.dials ?? {}) as Record<string, unknown>;
    const nextCycleConstraints = payload.nextCycleConstraints as
      | Record<string, unknown>
      | undefined;
    const constraints = nextCycleConstraints ?? {};
    const issuedAt = payload.issuedAt
      ? new Date(payload.issuedAt as string)
      : rows[0].occurred_at;
    return {
      studentId: payload.studentId as string,
      tightnessLevel: (payload.tightnessLevel as string) ?? 'Normal',
      adjustmentMode: (payload.adjustmentMode as string) ?? null,
      dials,
      constraints,
      issuedAt,
    };
  }
}
