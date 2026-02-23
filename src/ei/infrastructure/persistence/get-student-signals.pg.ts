import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import type { IGetStudentSignalsPort } from '../../application/assess-loop-health/port';
import type { StudentSignals } from '../../application/assess-loop-health/port';
import type { StudentAggregatesInput } from '../../domain/loop-health/aggregates-input';
import type { StudentPolicyInput } from '../../domain/loop-health/aggregates-input';
import type { TopicStateSnapshot } from '../../domain/student-aggregates/student-aggregates';

type DbClient = PostgresStore['db'];

function rowToAggregatesInput(row: Q.AggregatesRow): StudentAggregatesInput {
  return {
    pendingChecks: row.pending_checks,
    openLoops: row.open_loops,
    verificationRate7d: row.verification_rate_7d,
    scheduleMisses7d: row.schedule_misses_7d,
    avoidantExits7d: row.avoidant_exits_7d,
    skipCount7d: row.skip_count_7d,
    silenceDays: row.silence_days,
    startLatencyMin: row.start_latency_min_median_7d ?? undefined,
    intentAcceptanceRate7d: row.intent_acceptance_rate_7d ?? undefined,
    replanLoopCount7d: row.replan_loop_count_7d,
    stateTrend7d: row.state_trend_7d as StudentAggregatesInput['stateTrend7d'],
    loopLatencyTrend: (row.loop_latency_trend as StudentAggregatesInput['loopLatencyTrend']) ?? undefined,
  };
}

function rowToPolicyInput(row: Q.PolicyRow): StudentPolicyInput {
  const dials = (row.dials ?? {}) as Record<string, unknown>;
  const constraints = (row.constraints ?? {}) as Record<string, unknown>;
  return {
    tightnessLevel: row.tightness_level as StudentPolicyInput['tightnessLevel'],
    scopeMultiplier: dials.scopeMultiplier as number | undefined,
    difficultyTierDelta: dials.difficultyTierDelta as number | undefined,
    constraints: Object.keys(constraints).length > 0
      ? {
          closeOldestOpenLoopFirst:
            (constraints.closeOldestOpenLoopFirst as boolean | undefined) ??
            (constraints.closeLoopsFirst as boolean | undefined),
          noNewTopicUntil: constraints.noNewTopicUntil as string | undefined,
        }
      : undefined,
  };
}

function rowToTopicStateSnapshot(row: Q.TopicStateRow): TopicStateSnapshot {
  return {
    topicId: row.topic_id,
    lastEffortAt: row.last_effort_at,
    lastRetrievalAt: row.last_retrieval_at,
    lastScheduledDueAt: row.last_scheduled_due_at,
  };
}

export class PostgresGetStudentSignalsAdapter implements IGetStudentSignalsPort {
  constructor(private readonly db: DbClient) {}

  async getSignals(studentId: string): Promise<StudentSignals | null> {
    const [aggRow, policyRow, topicRows] = await Promise.all([
      Q.getAggregates(this.db, studentId),
      Q.getPolicy(this.db, studentId),
      Q.getAllTopicStates(this.db, studentId),
    ]);

    if (!aggRow) {
      return null;
    }

    const aggregates = rowToAggregatesInput(aggRow);
    const policy = policyRow ? rowToPolicyInput(policyRow) : undefined;
    const topicState =
      topicRows.length > 0 ? topicRows.map(rowToTopicStateSnapshot) : [];

    return {
      aggregates,
      topicState: topicState.length > 0 ? topicState : undefined,
      policy,
    };
  }
}
