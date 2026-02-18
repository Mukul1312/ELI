/**
 * Policy Store tools: getPolicy, setPolicy
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';
import { getEiDb } from '../../ei/runtime/db';

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
    const row = await Q.upsertPolicy(
      db,
      input.studentId,
      input.tightnessLevel,
      input.adjustmentMode ?? null,
      input.dials,
      input.constraints,
    );
    return formatRow(row);
  },
});
