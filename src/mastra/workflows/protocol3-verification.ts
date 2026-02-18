/**
 * Protocol 3: Verification Workflow (thin orchestrator)
 *
 * Trigger: SessionEnd event (student finishes a study session)
 * Output:  VerificationDecisionIssued event
 *
 * Flow:
 *   loadStudentContext  -> tools: computeAggregates, getPolicy, getTopicState, queryEvents
 *   checkCrossProtocol  -> pure:  read P1 verificationPlan floor + P2 watch-only flag from events
 *   classifyAndSelect   -> pure:  assignP3Label -> resolveMode -> escalation -> selectPlay
 *   executeAndEmit      -> pure:  executePlay (respects cross-protocol constraints) -> tool: appendEvent
 *   updateTopicState    -> tools: based on decision: emit RetrievalVerified/Scheduled/Skipped, updateTMS
 *
 * When a student later completes a scheduled verification (not during SessionEnd),
 * the client MUST send a VerificationCompleted event. That event is handled by
 * appendEvent tool directly (closes OpenLoop, updates TMS, resets SilenceDays).
 *
 * Anti-gaming: if time-per-question < ANTI_GAMING_TIME_PER_Q_SEC AND repeated
 * wrong answers, override to B3-02 (error-log format).
 *
 * @see EI_Protocol_3_Verification.md
 * @see EI_Engine_Taxonomy.md sections 3.3, 4
 */

import { createStep } from '@mastra/core/workflows';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Engine layers (pure functions)
import { assignP3Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P3Context } from '../../ei/engine/classify';
import { computeTightnessLevel, getP3Escalation, applyDoNoHarmGuardrail } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP3Play } from '../../ei/engine/play-executor';
import {
  findP1VerificationFloorFromEvents,
  findP2WatchOnlyFlagFromEvents,
} from '../../ei/engine/cross-protocol';
import type { StoredEvent } from '../../ei/engine/cross-protocol';
import { ANTI_GAMING_TIME_PER_Q_SEC } from '../../ei/engine/tunables';

// ============================================================================
// Step 1: Load student context via tools
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: z.object({
    studentId: z.string(),
    topic: z.string(),
    endedAt: z.string().datetime(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic } = inputData;

    // tool: computeAggregates({ studentId })
    const aggregates = {} as StudentAggregates;
    // tool: getPolicy({ studentId })
    const policy = {} as StudentPolicy;
    // tool: getTopicState({ studentId, topicId: topic })
    const topicState = {};
    // tool: queryEvents({ studentId, filters: { eventTypes: ['NegotiatedIntentIssued', 'ActivationPlanIssued', 'RetrievalVerified', 'RetrievalScheduled'] } })
    const recentEvents: StoredEvent[] = [];

    return {
      ...inputData,
      aggregates,
      policy,
      topicState,
      recentEvents,
    };
  },
});

// ============================================================================
// Step 2: Check cross-protocol constraints (pure)
// ============================================================================

const checkCrossProtocol = createStep({
  id: 'check-cross-protocol',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { recentEvents } = inputData;

    // Read P1 verification floor from the most recent NegotiatedIntentIssued
    const p1VerificationFloor = findP1VerificationFloorFromEvents(recentEvents);

    // Read P2 watch-only flag from the most recent ActivationPlanIssued
    const p2WatchOnlyFlag = findP2WatchOnlyFlagFromEvents(recentEvents);

    // Check if any retrieval/schedule already happened this session
    const hasRetrieval = recentEvents.some(
      (e: StoredEvent) => e.eventType === 'RetrievalVerified'
    );
    const hasSchedule = recentEvents.some(
      (e: StoredEvent) => e.eventType === 'RetrievalScheduled'
    );

    return {
      ...inputData,
      p1VerificationFloor,
      p2WatchOnlyFlag,
      hasRetrieval,
      hasSchedule,
    };
  },
});

// ============================================================================
// Step 3: Classify, check escalation, select play (pure)
// ============================================================================

const classifyAndSelectPlay = createStep({
  id: 'classify-and-select-play',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { aggregates, policy, hasRetrieval, hasSchedule } = inputData;

    const p3Context: P3Context = {
      hasRetrieval,
      hasSchedule,
    };

    // 1. Assign label
    const label = assignP3Label(p3Context, aggregates);

    // 2. Resolve mode
    const mode = resolveMode(label, aggregates, policy);

    // 3. Check P3-specific escalation
    const tightnessLevel = computeTightnessLevel(aggregates);
    const p3Escalation = getP3Escalation(aggregates);

    // 4. Build play context and select play
    const playContext: PlayContext = {
      studentId: inputData.studentId,
      topicId: inputData.topic,
      aggregates,
      tightnessLevel,
      p3Escalation,
      hasRetrieval,
      hasSchedule,
      loopLatencyTrend: aggregates.loopLatencyTrend,
    };

    const play = selectPlay(3, mode, playContext);

    return {
      ...inputData,
      label,
      mode,
      play,
      playContext,
      tightnessLevel,
      p3Escalation,
    };
  },
});

// ============================================================================
// Step 4: Execute play and emit event (pure + tool)
// ============================================================================

const executeAndEmit = createStep({
  id: 'execute-and-emit',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { play, playContext, policy, p1VerificationFloor, p2WatchOnlyFlag } = inputData;

    // Execute the play with cross-protocol constraints applied
    const output = executeP3Play(
      play,
      playContext,
      policy,
      p1VerificationFloor ?? undefined,
      p2WatchOnlyFlag ?? false,
    );

    // In actual implementation: tool call to appendEvent('VerificationDecisionIssued', output)

    return {
      ...inputData,
      decision: output,
    };
  },
});

// ============================================================================
// Step 5: Update topic state based on verification decision (tools)
// ============================================================================

const updateTopicState = createStep({
  id: 'update-topic-state',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { decision, studentId, topic } = inputData;

    // Based on the verification decision, emit the appropriate sub-event:
    //
    // VerifyNow   -> tool: appendEvent('RetrievalVerified', ...)
    //             -> tool: updateTMS({ studentId, topicId, ... })
    //
    // ScheduleVerify -> tool: appendEvent('RetrievalScheduled', ...)
    //                   (sets target_due_at in ei_topic_state)
    //
    // Skip         -> tool: appendEvent('RetrievalSkipped', { reason })

    return decision;
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const protocol3VerificationWorkflow = createWorkflow({
  id: 'ei-protocol3-verification',
  inputSchema: z.object({
    studentId: z.string(),
    topic: z.string(),
    endedAt: z.string().datetime(),
  }),
  outputSchema: z.any(),
})
  .then(loadStudentContext)
  .then(checkCrossProtocol)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .then(updateTopicState)
  .commit();
