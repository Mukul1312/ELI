/**
 * Student Policy Projector
 *
 * Recomputes ei_student_policy from the EI Event Ledger.
 * Used for admin repair/backfill when the policy table is inconsistent.
 */

import type { PostgresStore } from '@mastra/pg';
import { ApplyStrategicAdjustmentDecisionHandler } from '../../application/apply-strategic-adjustment-decision/handler';
import { PostgresStudentPolicyRepository } from '../persistence/student-policy-repository.pg';
import { PostgresStrategicAdjustmentDecisionEventReader } from '../persistence/strategic-adjustment-decision-event-reader.pg';

type DbClient = PostgresStore['db'];

/**
 * Rebuild student policy from the latest StrategicAdjustmentDecision event in the Ledger.
 * If no event exists, policy remains empty (no-op).
 */
export async function recomputeStudentPolicy(
  db: DbClient,
  studentId: string,
): Promise<void> {
  const eventReader = new PostgresStrategicAdjustmentDecisionEventReader(db);
  const decision = await eventReader.readLatestDecision(studentId);
  if (!decision) {
    return;
  }
  const repo = new PostgresStudentPolicyRepository(db);
  const handler = new ApplyStrategicAdjustmentDecisionHandler(repo);
  await handler.execute({
    studentId: decision.studentId,
    tightnessLevel: decision.tightnessLevel,
    adjustmentMode: decision.adjustmentMode,
    dials: decision.dials,
    constraints: decision.constraints,
    issuedAt: decision.issuedAt,
  });
}
