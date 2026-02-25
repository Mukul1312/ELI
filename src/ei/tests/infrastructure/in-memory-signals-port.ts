/**
 * InMemorySignalsPort — implements IGetStudentSignalsPort.
 *
 * Reads computed StudentAggregates from InMemoryStudentAggregatesRepo and
 * returns them as StudentSignals. Returns null if no aggregates have been
 * computed yet (gate handlers fall back to safe defaults in that case).
 */

import type { IGetStudentSignalsPort, StudentSignals } from '../../application/assess-loop-health/port';
import type { InMemoryStudentAggregatesRepo } from './in-memory-student-aggregates-repo';
import type { StudentPolicyInput } from '../../domain/loop-health/aggregates-input';

export class InMemorySignalsPort implements IGetStudentSignalsPort {
  constructor(
    private readonly aggregatesRepo: InMemoryStudentAggregatesRepo,
    private readonly policy?: StudentPolicyInput,
  ) {}

  async getSignals(studentId: string): Promise<StudentSignals | null> {
    const agg = this.aggregatesRepo.getByStudentId(studentId);
    if (!agg) return null;

    const metrics = agg.metrics;

    return {
      aggregates: {
        pendingChecks: metrics.pendingChecks,
        openLoops: metrics.openLoops,
        verificationRate7d: metrics.verificationRate7d,
        scheduleMisses7d: metrics.scheduleMisses7d,
        avoidantExits7d: metrics.avoidantExits7d,
        skipCount7d: metrics.skipCount7d,
        silenceDays: metrics.silenceDays,
        startLatencyMin: metrics.startLatencyMinMedian7d ?? undefined,
        replanLoopCount7d: metrics.replanLoopCount7d,
        stateTrend7d: metrics.stateTrend7d,
        loopLatencyTrend: (metrics.loopLatencyTrend as 'improving' | 'worsening' | 'stable' | undefined) ?? undefined,
      },
      policy: this.policy,
    };
  }
}
