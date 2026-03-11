/**
 * Strategic Adjustment Workflow (structured documentation)
 *
 * @see EI_Spec.md sections 4.6-4.8, 4.14
 * @see EI_Engine_Taxonomy.md section 3.4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import type { StudentAggregates } from '../../ei/engine/classify';
import { computeTightnessLevel } from '../../ei/engine/escalation';
import { computeStrategicAdjustment } from '../../ei/engine/strategic-adjustment';
import type { DeltaMetrics, TopicState } from '../../ei/engine/strategic-adjustment';
import { SA_REVIEW_WINDOW_MIN_DAYS } from '../../ei/engine/tunables';
import { SCHEDULE_GRACE_HOURS } from '../../ei/engine/tunables';
import { PostgresStudentPolicyRepository } from '../../ei/infrastructure/persistence/student-policy-repository.pg';
import { PostgresGetStudentSignalsAdapter } from '../../ei/infrastructure/persistence/get-student-signals.pg';
import { PostgresStudentAggregatesRepository } from '../../ei/infrastructure/persistence/student-aggregates-repository.pg';
import { PostgresStudentEventStreamReader } from '../../ei/infrastructure/persistence/student-event-stream-reader.pg';
import { PostgresTopicStateReader } from '../../ei/infrastructure/persistence/topic-state-reader.pg';
import { ApplyStrategicAdjustmentDecisionHandler } from '../../ei/application/apply-strategic-adjustment-decision/handler';
import { RecomputeStudentAggregatesHandler } from '../../ei/application/recompute-student-aggregates/handler';
import { getDb } from '../../ei/runtime/db';
import { getClock } from '../../ei/runtime/clock';
import * as Q from '../../ei/db/queries';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';

// ============================================================================
// Schemas
// ============================================================================

const AggregatesSchema = z.object({
  pendingChecks: z.number(), openLoops: z.number(), verificationRate7d: z.number(),
  scheduleMisses7d: z.number(), avoidantExits7d: z.number(), skipCount7d: z.number(),
  silenceDays: z.number(), startLatencyMin: z.number().optional(),
  intentAcceptanceRate7d: z.number().nullable().optional(), replanLoopCount7d: z.number(),
  stateTrend7d: z.enum(['improving', 'flat', 'worsening']),
  loopLatencyTrend: z.enum(['improving', 'worsening', 'stable']).nullable().optional(),
});

const SAInput = z.object({ studentId: z.string(), trigger: z.enum(['scheduled', 'risk-triggered']) });

const Loaded = SAInput.extend({
  aggregates: AggregatesSchema, topicStates: z.array(z.record(z.unknown())),
  reviewEvents: z.array(z.object({ eventType: z.string(), payload: z.record(z.unknown()), occurredAt: z.coerce.date() })),
  reviewWindowDays: z.number(),
});

const DeltaSchema = z.object({
  ambitionDelta: z.number(), executionDelta: z.number(), efficiencyDelta: z.number(), perceptionDelta: z.number(),
});

const Deltaed = Loaded.extend({ deltas: DeltaSchema });

const SADecisionSchema = z.object({ mode: z.string(), dials: z.record(z.unknown()), diagnosis: z.string().optional() });
const Decided = Deltaed.extend({ saDecision: SADecisionSchema });
const Tightened = Decided.extend({ tightnessLevel: z.string() });
const FinalOutput = z.object({ studentId: z.string(), mode: z.string(), dials: z.record(z.unknown()), diagnosis: z.string().optional(), tightnessLevel: z.string() });

// ============================================================================
// Steps
// ============================================================================

const loadFullEvidence = createStep({
  id: 'load-full-evidence',
  inputSchema: SAInput,
  outputSchema: Loaded,
  execute: async (params): Promise<any> => {
    const { inputData } = params as { inputData: z.infer<typeof SAInput> };
    const db = getDb();
    const clock = getClock({});

    const signalsAdapter = new PostgresGetStudentSignalsAdapter(db);
    let signals = await signalsAdapter.getSignals(inputData.studentId);

    if (!signals) {
      const graceMs = SCHEDULE_GRACE_HOURS * 60 * 60 * 1000;
      const repo = new PostgresStudentAggregatesRepository(db);
      const eventReader = new PostgresStudentEventStreamReader(db);
      const topicReader = new PostgresTopicStateReader(db);
      const recomputeHandler = new RecomputeStudentAggregatesHandler(
        repo,
        eventReader,
        topicReader,
        clock,
      );
      await recomputeHandler.execute({
        studentId: inputData.studentId,
        graceMs,
      });
      signals = await signalsAdapter.getSignals(inputData.studentId);
    }

    const aggregates = signals?.aggregates ?? null;
    if (!aggregates) {
      return {
        ...inputData,
        aggregates: {} as StudentAggregates,
        topicStates: [] as TopicState[],
        reviewEvents: [],
        reviewWindowDays: SA_REVIEW_WINDOW_MIN_DAYS,
      };
    }

    const reviewUntil = new Date(clock.now());
    const reviewSince = new Date(
      clock.now().getTime() - SA_REVIEW_WINDOW_MIN_DAYS * 24 * 60 * 60 * 1000,
    );

    const [topicRows, reviewRows] = await Promise.all([
      Q.getAllTopicStates(db, inputData.studentId),
      Q.queryEvents(db, inputData.studentId, { since: reviewSince, until: reviewUntil }),
    ]);

    const topicStates: TopicState[] = topicRows.map((row) => ({
      topicId: row.topic_id,
      effortCount7d: row.effort_count_7d ?? 0,
      retrievalCount7d: row.retrieval_count_7d ?? 0,
      tms: row.tms,
      deltaDecay: row.delta_decay,
    }));

    const reviewEvents = reviewRows.map((r) => ({
      eventType: r.event_type,
      payload: r.payload,
      occurredAt: r.occurred_at instanceof Date ? r.occurred_at : new Date(r.occurred_at),
    }));

    return {
      ...inputData,
      aggregates,
      topicStates,
      reviewEvents,
      reviewWindowDays: SA_REVIEW_WINDOW_MIN_DAYS,
    };
  },
});

const computeDeltas = createStep({
  id: 'compute-deltas', inputSchema: Loaded, outputSchema: Deltaed,
  execute: async ({ inputData }): Promise<any> => ({
    ...inputData,
    deltas: { ambitionDelta: 0, executionDelta: 0, efficiencyDelta: 0, perceptionDelta: 0 } satisfies DeltaMetrics,
  }),
});

const matchScenarioAndDials = createStep({
  id: 'match-scenario-and-dials', inputSchema: Deltaed, outputSchema: Decided,
  execute: async ({ inputData }): Promise<any> => ({
    ...inputData,
    saDecision: computeStrategicAdjustment(
      inputData.deltas as unknown as DeltaMetrics,
      inputData.aggregates as unknown as StudentAggregates,
      inputData.topicStates as unknown as TopicState[],
    ),
  }),
});

const computeTightnessStep = createStep({
  id: 'compute-tightness', inputSchema: Decided, outputSchema: Tightened,
  execute: async ({ inputData }): Promise<any> => ({
    ...inputData,
    tightnessLevel: computeTightnessLevel(inputData.aggregates as unknown as StudentAggregates),
  }),
});

const persistAndEmit = createStep({
  id: 'persist-and-emit', inputSchema: Tightened, outputSchema: FinalOutput,
  execute: async (params): Promise<any> => {
    const { inputData } = params as { inputData: z.infer<typeof Tightened> };
    const db = getDb();
    const issuedAt = new Date();

    const dials = inputData.saDecision.dials as Record<string, unknown>;
    const constraints = (dials as { constraints?: Record<string, unknown> }).constraints ?? {};
    const { constraints: _c, ...dialsWithoutConstraints } = dials;

    const ledgerPayload = validateEventPayload('StrategicAdjustmentDecision', {
      studentId: inputData.studentId,
      adjustmentMode: inputData.saDecision.mode,
      dials: dialsWithoutConstraints,
      nextCycleConstraints: Object.keys(constraints).length > 0 ? constraints : undefined,
      tightnessLevel: inputData.tightnessLevel,
      issuedAt: issuedAt.toISOString(),
    } as Record<string, unknown>);
    const idempotencyKey = `sa:StrategicAdjustmentDecision:${inputData.studentId}:${issuedAt.toISOString()}`;
    await Q.insertEvent(
      db,
      inputData.studentId,
      'StrategicAdjustmentDecision',
      null,
      ledgerPayload,
      issuedAt,
      idempotencyKey,
    );

    const repo = new PostgresStudentPolicyRepository(db);
    const handler = new ApplyStrategicAdjustmentDecisionHandler(repo);
    await handler.execute({
      studentId: inputData.studentId,
      tightnessLevel: inputData.tightnessLevel,
      adjustmentMode: inputData.saDecision.mode,
      dials,
      constraints,
      issuedAt,
    });

    return {
      studentId: inputData.studentId, mode: inputData.saDecision.mode,
      dials: inputData.saDecision.dials, diagnosis: inputData.saDecision.diagnosis,
      tightnessLevel: inputData.tightnessLevel,
    };
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const strategicAdjustmentWorkflow = createWorkflow({
  id: 'ei-strategic-adjustment', inputSchema: SAInput, outputSchema: FinalOutput,
})
  .then(loadFullEvidence).then(computeDeltas).then(matchScenarioAndDials)
  .then(computeTightnessStep).then(persistAndEmit).commit();
