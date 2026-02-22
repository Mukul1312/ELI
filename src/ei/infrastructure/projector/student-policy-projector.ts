/**
 * Student Policy Projector
 *
 * Recomputes ei_student_policy from the EI Event Ledger.
 * Used for admin repair/backfill when the policy table is inconsistent.
 */

import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import { ApplyStrategicAdjustmentDecisionHandler } from '../../application/apply-strategic-adjustment-decision/handler';
import { PostgresStudentPolicyRepository } from '../persistence/student-policy-repository.pg';

type DbClient = PostgresStore['db'];

/**
 * Rebuild student policy from the latest StrategicAdjustmentDecision event in the Ledger.
 * If no event exists, policy remains empty (no-op).
 */
export async function recomputeStudentPolicy(db: DbClient, studentId: string): Promise<void> {
  const rows = await Q.queryEvents(db, studentId, {
    eventTypes: ['StrategicAdjustmentDecision'],
    limit: 1,
  });
  if (rows.length === 0) {
    return;
  }
  const payload = rows[0].payload as Record<string, unknown>;
  const dials = (payload.dials ?? {}) as Record<string, unknown>;
  const nextCycleConstraints = payload.nextCycleConstraints as Record<string, unknown> | undefined;
  const constraints = nextCycleConstraints ?? {};
  const issuedAt = payload.issuedAt
    ? new Date(payload.issuedAt as string)
    : rows[0].occurred_at;
  const command = {
    studentId: payload.studentId as string,
    tightnessLevel: (payload.tightnessLevel as string) ?? 'Normal',
    adjustmentMode: (payload.adjustmentMode as string) ?? null,
    dials,
    constraints,
    issuedAt,
  };
  const repo = new PostgresStudentPolicyRepository(db);
  const handler = new ApplyStrategicAdjustmentDecisionHandler(repo);
  await handler.execute(command);
}
