/**
 * Compose P1 view step — Mastra step wrapping EI ViewComposer for P1.
 *
 * Lives in src/mastra/workflows/steps/ so EI has no dependency on Mastra.
 * Receives domain output + workflow input + real aggregates from DB,
 * returns wrapped response { ...domainOutput, schemaVersion, phase, view, actions }.
 *
 * @see src/ei/sdui/view-composer.ts — composeP1View pure function
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md — Gateway context
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { getDb } from '../../../ei/runtime/db';
import { PostgresAppendEventAdapter } from '../../../ei/infrastructure/persistence/append-event.pg';
import { SessionIntentIssuedSchema } from '../../../ei/schemas/outputs';
import { P1WrappedResponseSchema } from '../../../ei/study-session-orchestration/types/sdui-contract';
import { buildP1PresentationContext } from '../../../ei/study-session-orchestration/domain/value-objects/presentation-context';
import { composeP1View, selectPhase1Variant } from '../../../ei/study-session-orchestration/domain/services/view-composer';
import type { AggregatesForPresentation } from '../../../ei/study-session-orchestration/domain/types/aggregates-for-presentation';
import type { TopicStateSnapshot } from '../../../ei/domain/student-aggregates/student-aggregates';
import type { StateTrend } from '../../../ei/domain/student-aggregates/student-aggregates';

// Zod subsets of DB row types — passed from protocol1-ignition .map() step.
const AggregatesSubsetSchema = z.object({
  pending_checks: z.number(),
  open_loops: z.number(),
  verification_rate_7d: z.number(),
  silence_days: z.number(),
  state_trend_7d: z.string(),
}).nullable();

const TopicStateSubsetSchema = z.object({
  topic_id: z.string(),
  topic_name: z.string().nullable().optional(),
  last_effort_at: z.date().nullable(),
  last_retrieval_at: z.date().nullable(),
  last_scheduled_due_at: z.date().nullable(),
  effort_count_total: z.number().optional(),
  last_task_type: z.string().nullable().optional(),
});

function mapAggregatesForPresentation(row: z.infer<typeof AggregatesSubsetSchema>): AggregatesForPresentation | null {
  if (!row) return null;
  return {
    pendingChecks: row.pending_checks,
    silenceDays: row.silence_days,
    verificationRate7d: row.verification_rate_7d,
    stateTrend7d: (row.state_trend_7d as StateTrend) || 'flat',
  };
}

function mapTopicSnapshots(rows: z.infer<typeof TopicStateSubsetSchema>[]): TopicStateSnapshot[] {
  return [...rows]
    .map((r) => ({
      topicId: r.topic_id,
      topicName: r.topic_name ?? undefined,
      lastEffortAt: r.last_effort_at,
      lastRetrievalAt: r.last_retrieval_at,
      lastScheduledDueAt: r.last_scheduled_due_at,
      effortCountTotal: r.effort_count_total ?? 0,
      lastTaskType: r.last_task_type ?? null,
    }))
    .sort((a, b) => (a.lastScheduledDueAt?.getTime() ?? 0) - (b.lastScheduledDueAt?.getTime() ?? 0));
}

// ============================================================================
// Input schema: domain output + workflow input + real aggregates from DB
// ============================================================================

export const ComposeP1ViewInputSchema = z.object({
  domainOutput: SessionIntentIssuedSchema,
  workflowInput: z.object({
    energy: z.number(),
  }),
  aggregates: AggregatesSubsetSchema,
  topicStates: z.array(TopicStateSubsetSchema),
  sessionsLast7d: z.number(),
  loopsClosedLast7d: z.number(),
  sessionsTotal: z.number(),
  hasPriorOpen: z.boolean(),
  lastIdentityShownAt: z.date().nullable(),
  historicalIndicators: z
    .object({ hadSilenceInLast14d: z.boolean(), hadHighPressureInLast14d: z.boolean() })
    .optional(),
  correlationId: z.string().optional(),
});

// ============================================================================
// Step definition
// ============================================================================

/** Pure compose function — callable without Mastra step context. */
export async function executeComposeP1View(
  inputData: z.infer<typeof ComposeP1ViewInputSchema>,
): Promise<z.infer<typeof P1WrappedResponseSchema>> {
  const {
    domainOutput,
    workflowInput,
    aggregates,
    topicStates,
    sessionsLast7d,
    loopsClosedLast7d,
    sessionsTotal,
    hasPriorOpen,
    lastIdentityShownAt,
    historicalIndicators,
  } = inputData;

  const ctx = buildP1PresentationContext(
    domainOutput,
    workflowInput,
    mapAggregatesForPresentation(aggregates),
    mapTopicSnapshots(topicStates),
    { sessionsLast7d, loopsClosedLast7d },
    lastIdentityShownAt,
    historicalIndicators,
    hasPriorOpen,
    sessionsTotal,
  );
  const sdui = composeP1View(domainOutput, ctx);

  // Emit ViewComposed — PresentationTrace observability (ops-observability-tactical-spec §12).
  // selectPhase1Variant is deterministic/pure: safe to call again with same ctx.
  const variant = selectPhase1Variant(ctx);
  await new PostgresAppendEventAdapter(getDb()).append({
    studentId: domainOutput.studentId,
    eventType: 'ViewComposed',
    topicId: domainOutput.topicId ?? domainOutput.topic ?? null,
    payload: {
      studentId: domainOutput.studentId,
      correlationId: inputData.correlationId,
      phase: 'p1',
      variant,
      presentationSignals: {
        energy: ctx.energy,
        silenceDays: ctx.silenceDays,
        pendingChecks: ctx.pendingChecks,
        mode: ctx.mode,
        sessionsTotal: ctx.sessionsTotal,
      },
      composedAt: new Date().toISOString(),
    },
  });

  return {
    ...domainOutput,
    schemaVersion: sdui.schemaVersion,
    phase: sdui.phase,
    view: sdui.view,
    actions: sdui.actions,
  };
}

export const composeP1ViewStep = createStep({
  id: 'compose-p1-view',
  inputSchema: ComposeP1ViewInputSchema,
  outputSchema: P1WrappedResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof P1WrappedResponseSchema>> =>
    executeComposeP1View(inputData),
});
