/**
 * recomputeTopicLoopTool — projector backfill for ei_topic_loop.
 *
 * Recomputes TopicLoop state from scratch by replaying all events for a (studentId, topicId).
 * For full-student backfill, caller must iterate over topics (or use listStudents + getAllTopicStates).
 *
 * Ordering rule (per student-aggregates-tactical-spec §8): When recomputing from scratch,
 * run TopicLoop before StudentAggregates. StudentAggregates derives openLoops/pendingChecks
 * from TopicLoop state.
 *
 * @see docs/strategic-design/tactical/ops-observability-tactical-spec.md §7, §8
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { eiStore } from '../../ei/runtime/db';
import { createCorrelationId, logBackfillAudit } from '../../ei/infrastructure/logging';

export const recomputeTopicLoopTool = createTool({
  id: 'recompute-topic-loop',
  description:
    'Recompute TopicLoop projection for a (studentId, topicId). Run before computeAggregates for full-student backfill. Idempotent, auditable.',
  inputSchema: z.object({
    studentId: z.string(),
    topicId: z.string(),
  }),
  outputSchema: z.object({
    studentId: z.string(),
    topicId: z.string(),
    correlationId: z.string(),
  }),
  execute: async (input, context) => {
    const correlationId = createCorrelationId();
    const db = eiStore.db;

    await recomputeTopicLoop(db, input.studentId, input.topicId);

    logBackfillAudit({
      correlationId,
      projectionName: 'TopicLoop',
      studentId: input.studentId,
      topicId: input.topicId,
      completedAt: new Date().toISOString(),
    });

    return {
      studentId: input.studentId,
      topicId: input.topicId,
      correlationId,
    };
  },
});
