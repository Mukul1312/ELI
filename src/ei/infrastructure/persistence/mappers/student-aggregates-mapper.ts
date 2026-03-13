import type { AggregatesRow } from '../../../db/queries';
import { StudentAggregates, type StateTrend } from '../../../domain/student-aggregates/student-aggregates';
import { StudentAggregatesId } from '../../../domain/student-aggregates/value-objects';

export const StudentAggregatesMapper = {
  toDomain(row: AggregatesRow): StudentAggregates {
    const id = StudentAggregatesId.create(row.student_id);
    return StudentAggregates.reconstitute(id, {
      pendingChecks: row.pending_checks,
      openLoops: row.open_loops,
      verificationRate7d: row.verification_rate_7d,
      scheduleMisses7d: row.schedule_misses_7d,
      avoidantExits7d: row.avoidant_exits_7d,
      skipCount7d: row.skip_count_7d,
      silenceDays: row.silence_days,
      startLatencyMinMedian7d: row.start_latency_min_median_7d,
      intentAcceptanceRate7d: row.intent_acceptance_rate_7d,
      replanLoopCount7d: row.replan_loop_count_7d,
      stateTrend7d: row.state_trend_7d as StateTrend,
      loopLatencyTrend: row.loop_latency_trend,
      sessionsLast7d: row.sessions_last_7d,
      loopsClosedLast7d: row.loops_closed_last_7d,
      hasPriorAppOpen: row.has_prior_app_open,
      lastIdentityShownAt: row.last_identity_shown_at,
      activeDays7d: row.active_days_7d,
    });
  },

  toPersistence(
    aggregate: StudentAggregates,
  ): Omit<AggregatesRow, 'student_id' | 'updated_at'> {
    const m = aggregate.metrics;
    return {
      pending_checks: m.pendingChecks,
      open_loops: m.openLoops,
      verification_rate_7d: m.verificationRate7d,
      schedule_misses_7d: m.scheduleMisses7d,
      avoidant_exits_7d: m.avoidantExits7d,
      skip_count_7d: m.skipCount7d,
      silence_days: m.silenceDays,
      start_latency_min_median_7d: m.startLatencyMinMedian7d,
      intent_acceptance_rate_7d: m.intentAcceptanceRate7d,
      replan_loop_count_7d: m.replanLoopCount7d,
      state_trend_7d: m.stateTrend7d,
      loop_latency_trend: m.loopLatencyTrend,
      sessions_last_7d: m.sessionsLast7d,
      loops_closed_last_7d: m.loopsClosedLast7d,
      has_prior_app_open: m.hasPriorAppOpen,
      last_identity_shown_at: m.lastIdentityShownAt,
      active_days_7d: m.activeDays7d,
    };
  },
};
