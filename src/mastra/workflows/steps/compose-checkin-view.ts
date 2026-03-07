/**
 * Compose checkin view step — Mastra step for first-touch AppOpen.
 *
 * Builds PresentationContext with real aggregates and returns SduiResponse (checkin view).
 * No P1 gate; used when client sends AppOpen with initial: true.
 *
 * @see src/ei/sdui/view-composer.ts — composeCheckinView pure function
 */

import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { eiStore } from '../../../ei/runtime/db';
import * as Q from '../../../ei/db/queries';
import { SduiResponseSchema } from '../../../ei/sdui/types/sdui-contract';
import { buildCheckinPresentationContext } from '../../../ei/sdui/presentation-context';
import { composeCheckinView, composeOnboardingWelcomeView } from '../../../ei/sdui/view-composer';
import { computeIdentityEligibility } from '../../../ei/sdui/identity/compute-identity-eligibility';
import type { AggregatesForPresentation } from '../../../ei/sdui/types/aggregates-for-presentation';
import type { TopicStateSnapshot } from '../../../ei/domain/student-aggregates/student-aggregates';
import type { StateTrend } from '../../../ei/domain/student-aggregates/student-aggregates';

function mapAggregatesForPresentation(row: Q.AggregatesRow | null): AggregatesForPresentation | null {
  if (!row) return null;
  return {
    pendingChecks: row.pending_checks,
    silenceDays: row.silence_days,
    verificationRate7d: row.verification_rate_7d,
    stateTrend7d: (row.state_trend_7d as StateTrend) || 'flat',
  };
}

function mapTopicSnapshots(rows: Q.TopicStateRow[]): TopicStateSnapshot[] {
  return [...rows]
    .map((r) => ({
      topicId: r.topic_id,
      topicName: r.topic_name ?? undefined,
      lastEffortAt: r.last_effort_at,
      lastRetrievalAt: r.last_retrieval_at,
      lastScheduledDueAt: r.last_scheduled_due_at,
    }))
    .sort((a, b) => (a.lastScheduledDueAt?.getTime() ?? 0) - (b.lastScheduledDueAt?.getTime() ?? 0));
}

const CheckinViewInputSchema = z.object({
  studentId: z.string(),
  isFirstOfDay: z.boolean(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const composeCheckinViewStep = createStep({
  id: 'compose-checkin-view',
  inputSchema: CheckinViewInputSchema,
  outputSchema: SduiResponseSchema,
  execute: async ({ inputData }): Promise<z.infer<typeof SduiResponseSchema>> => {
    const { studentId, isFirstOfDay, idempotencyKey } = inputData;
    const db = eiStore.db;

    const [aggregates, topicRows, eventCounts, lastIdentityShownAt, historicalIndicators, hasPriorOpen, recentTopicRows] =
      await Promise.all([
        Q.getAggregates(db, studentId),
        Q.getAllTopicStates(db, studentId),
        Q.countStudentEventsLast7d(db, studentId),
        Q.getLastIdentityShownAt(db, studentId),
        Q.getHistoricalIdentityIndicators(db, studentId),
        Q.hasPriorAppOpen(db, studentId),
        Q.getRecentTopics(db, studentId, 5),
      ]);

    const ctx = buildCheckinPresentationContext(
      isFirstOfDay,
      studentId,
      mapAggregatesForPresentation(aggregates),
      mapTopicSnapshots(topicRows),
      eventCounts,
      lastIdentityShownAt,
      historicalIndicators,
      hasPriorOpen,
    );

    // First-ever: show onboarding welcome (Screen 1) — no identity card, no energy/sleep
    if (!hasPriorOpen) {
      return composeOnboardingWelcomeView();
    }

    // Identity eligibility check — if eligible, persist the event (rate-limits future cards)
    const identityEligibility = computeIdentityEligibility(ctx);
    if (identityEligibility.eligible && identityEligibility.statement) {
      const ik = idempotencyKey ? `${idempotencyKey}:IdentityMomentShown` : undefined;
      await Q.insertIdentityMomentShownEvent(
        db,
        studentId,
        identityEligibility.statement.statement,
        ik,
      );
    }

    const recentTopics = recentTopicRows
      .filter((r) => r.topic_name)
      .map((r) => ({ id: r.topic_id, name: r.topic_name! }));

    return composeCheckinView(ctx, identityEligibility, recentTopics);
  },
});
