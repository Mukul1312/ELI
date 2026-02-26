/**
 * recomputeStudentPolicyTool — projector backfill for ei_student_policy.
 *
 * Recomputes StudentPolicy from the latest StrategicAdjustmentDecision event in the Ledger.
 * If no event exists, policy remains empty (no-op).
 *
 * @see docs/strategic-design/tactical/ops-observability-tactical-spec.md §7, §8
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { recomputeStudentPolicy } from '../../ei/infrastructure/projector/student-policy-projector';
import { eiStore } from '../../ei/runtime/db';
import { createCorrelationId, logBackfillAudit } from '../../ei/infrastructure/logging';

export const recomputeStudentPolicyTool = createTool({
  id: 'recompute-student-policy',
  description:
    'Recompute StudentPolicy projection for a student from the latest StrategicAdjustmentDecision event. Idempotent, auditable.',
  inputSchema: z.object({
    studentId: z.string(),
  }),
  outputSchema: z.object({
    studentId: z.string(),
    correlationId: z.string(),
  }),
  execute: async (input, context) => {
    const correlationId = createCorrelationId();
    const db = eiStore.db;

    await recomputeStudentPolicy(db, input.studentId);

    logBackfillAudit({
      correlationId,
      projectionName: 'StudentPolicy',
      studentId: input.studentId,
      completedAt: new Date().toISOString(),
    });

    return {
      studentId: input.studentId,
      correlationId,
    };
  },
});
