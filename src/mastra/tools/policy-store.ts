/**
 * Policy Store tools: getPolicy, setPolicy
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';
import { getEiDb } from '../../ei/runtime/db';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import { PostgresStudentPolicyRepository } from '../../ei/infrastructure/persistence/student-policy-repository.pg';
import { ApplyStrategicAdjustmentDecisionHandler } from '../../ei/application/apply-strategic-adjustment-decision/handler';

const SADIALS_KEYS = ['scopeMultiplier', 'difficultyTierDelta', 'minQuestionsDefault', 'scheduleAllowed', 'dueInHoursDefault'] as const;
const DEFAULT_DIALS = { scopeMultiplier: 1, difficultyTierDelta: 0, minQuestionsDefault: 2, scheduleAllowed: true };
const ADJUSTMENT_MODES = ['Recovery', 'DifficultyRaise', 'TechniquePivot', 'CloseLoopsFirst', 'IntegrityClamp'] as const;

const policyOutput = z.object({
  studentId: z.string(),
  tightnessLevel: z.string(),
  adjustmentMode: z.string().nullable(),
  dials: z.record(z.unknown()),
  constraints: z.record(z.unknown()),
  updatedAt: z.string(),
});

function formatRow(r: Q.PolicyRow) {
  return {
    studentId: r.student_id,
    tightnessLevel: r.tightness_level,
    adjustmentMode: r.adjustment_mode,
    dials: r.dials,
    constraints: r.constraints,
    updatedAt: r.updated_at.toISOString(),
  };
}

export const getPolicyTool = createTool({
  id: 'get-policy',
  description: 'Read student policy (tightness level + SA dials)',
  inputSchema: z.object({
    studentId: z.string(),
  }),
  outputSchema: policyOutput.nullable(),
  execute: async (input, context) => {
    const db = getEiDb(context);
    const row = await Q.getPolicy(db, input.studentId);
    return row ? formatRow(row) : null;
  },
});

export const setPolicyTool = createTool({
  id: 'set-policy',
  description: 'Upsert student policy (called by Strategic Adjustment workflow)',
  inputSchema: z.object({
    studentId: z.string(),
    tightnessLevel: z.string(),
    adjustmentMode: z.string().optional(),
    dials: z.record(z.unknown()).default({}),
    constraints: z.record(z.unknown()).default({}),
  }),
  outputSchema: policyOutput,
  execute: async (input, context) => {
    const db = getEiDb(context);
    const issuedAt = new Date();
    const dialsRaw = { ...DEFAULT_DIALS, ...input.dials } as Record<string, unknown>;
    const dials = Object.fromEntries(
      SADIALS_KEYS.filter((k) => dialsRaw[k] !== undefined).map((k) => [k, dialsRaw[k]])
    ) as Record<string, unknown>;
    if (Object.keys(dials).length === 0) {
      Object.assign(dials, DEFAULT_DIALS);
    }
    const adjustmentMode = input.adjustmentMode && ADJUSTMENT_MODES.includes(input.adjustmentMode as (typeof ADJUSTMENT_MODES)[number])
      ? input.adjustmentMode
      : 'Recovery';
    const nextCycleConstraints =
      Object.keys(input.constraints).length > 0 ? (input.constraints as Record<string, unknown>) : undefined;

    const ledgerPayload = validateEventPayload('StrategicAdjustmentDecision', {
      studentId: input.studentId,
      adjustmentMode,
      dials,
      nextCycleConstraints,
      tightnessLevel: input.tightnessLevel,
      issuedAt: issuedAt.toISOString(),
    } as Record<string, unknown>);
    const idempotencyKey = `sa:StrategicAdjustmentDecision:${input.studentId}:${issuedAt.toISOString()}`;
    await Q.insertEvent(
      db,
      input.studentId,
      'StrategicAdjustmentDecision',
      null,
      ledgerPayload,
      issuedAt,
      idempotencyKey,
    );

    const repo = new PostgresStudentPolicyRepository(db);
    const handler = new ApplyStrategicAdjustmentDecisionHandler(repo);
    await handler.execute({
      studentId: input.studentId,
      tightnessLevel: input.tightnessLevel,
      adjustmentMode: input.adjustmentMode ?? null,
      dials: { ...dials, constraints: nextCycleConstraints ?? {} },
      constraints: nextCycleConstraints ?? input.constraints,
      issuedAt,
    });

    const row = await Q.getPolicy(db, input.studentId);
    return formatRow(row!);
  },
});
