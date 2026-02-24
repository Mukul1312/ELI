import { AggregateRoot } from '../shared/aggregate-root';
import { StudentAggregatesId } from './value-objects';

export type StateTrend = 'improving' | 'flat' | 'worsening';

export interface TopicStateSnapshot {
  topicId: string;
  lastEffortAt: Date | null;
  lastRetrievalAt: Date | null;
  lastScheduledDueAt: Date | null;
}

export interface DomainEventSnapshot {
  eventType: string;
  topicId: string | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

export interface RecomputeInput {
  now: Date;
  sevenDaysAgo: Date;
  graceMs: number;
  events: DomainEventSnapshot[];
  topicStates: TopicStateSnapshot[];
  allTimeLatestEvent: DomainEventSnapshot | null;
}

export interface AggregateMetrics {
  pendingChecks: number;
  openLoops: number;
  verificationRate7d: number;
  scheduleMisses7d: number;
  avoidantExits7d: number;
  skipCount7d: number;
  silenceDays: number;
  startLatencyMinMedian7d: number | null;
  intentAcceptanceRate7d: number | null;
  replanLoopCount7d: number;
  stateTrend7d: StateTrend;
  loopLatencyTrend: string | null;
}

export class StudentAggregates extends AggregateRoot<StudentAggregatesId> {
  private _metrics: AggregateMetrics;

  private constructor(id: StudentAggregatesId, metrics: AggregateMetrics) {
    super(id);
    this._metrics = metrics;
  }

  get studentId(): string {
    return this._id.studentId;
  }

  get metrics(): AggregateMetrics {
    return this._metrics;
  }

  static reconstitute(id: StudentAggregatesId, metrics: AggregateMetrics): StudentAggregates {
    return new StudentAggregates(id, metrics);
  }

  /**
   * Full-replace recompute from events + topic state.
   * Pure computation; all inputs are domain snapshots.
   */
  static recompute(
    id: StudentAggregatesId,
    input: RecomputeInput,
  ): StudentAggregates {
    const { now, sevenDaysAgo, graceMs, topicStates, allTimeLatestEvent } = input;
    const events = [...input.events].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const nowMs = now.getTime();
    const sevenDaysAgoMs = sevenDaysAgo.getTime();

    const pendingChecks = Math.max(0, topicStates.filter(
      (t) => t.lastEffortAt && (!t.lastRetrievalAt || t.lastEffortAt > t.lastRetrievalAt),
    ).length);

    const openLoops = Math.max(0, topicStates.filter((t) => {
      if (!t.lastScheduledDueAt) return false;
      const dueAt = t.lastScheduledDueAt.getTime();
      const retrievedAt = t.lastRetrievalAt ? t.lastRetrievalAt.getTime() : 0;
      return dueAt + graceMs < nowMs && retrievedAt < dueAt;
    }).length);

    const sessionEnds = events.filter((e) => e.eventType === 'SessionEnd').length;
    const verified = events.filter(
      (e) => e.eventType === 'RetrievalVerified' || e.eventType === 'VerificationCompleted',
    ).length;
    const verificationRate7d = Math.min(1, sessionEnds > 0 ? verified / sessionEnds : 1.0);

    const scheduleMisses7d = Math.max(0, topicStates.filter((t) => {
      if (!t.lastScheduledDueAt) return false;
      const dueAt = t.lastScheduledDueAt.getTime();
      const retrievedAt = t.lastRetrievalAt ? t.lastRetrievalAt.getTime() : 0;
      return dueAt >= sevenDaysAgoMs && dueAt + graceMs < nowMs && retrievedAt < dueAt;
    }).length);

    const sessionEndEvents = events.filter((e) => e.eventType === 'SessionEnd');
    const verifiedTopics = new Set(
      events
        .filter((e) => ['RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted'].includes(e.eventType))
        .map((e) => `${e.topicId}:${e.occurredAt.toISOString().slice(0, 10)}`),
    );
    const avoidantExits7d = Math.max(0, sessionEndEvents.filter((se) => {
      const key = `${se.topicId}:${se.occurredAt.toISOString().slice(0, 10)}`;
      return !verifiedTopics.has(key);
    }).length);

    const skipCount7d = Math.max(0, events.filter((e) => e.eventType === 'RetrievalSkipped').length);

    const meaningfulTypes = ['IntentSet', 'SessionEnd', 'RetrievalVerified', 'VerificationCompleted'];
    const lastMeaningful = events.find((e) => meaningfulTypes.includes(e.eventType));
    let silenceDays: number;
    if (lastMeaningful) {
      silenceDays = Math.max(0, Math.floor((nowMs - lastMeaningful.occurredAt.getTime()) / (24 * 60 * 60 * 1000)));
    } else if (allTimeLatestEvent) {
      silenceDays = Math.max(0, Math.floor((nowMs - allTimeLatestEvent.occurredAt.getTime()) / (24 * 60 * 60 * 1000)));
    } else {
      silenceDays = 0;
    }

    const intentIssued = events.filter((e) => e.eventType === 'NegotiatedIntentIssued').length;
    const intentAccepted = events.filter(
      (e) => e.eventType === 'IntentResponse' &&
        ((e.payload as any).decision === 'accepted' || (e.payload as any).decision === 'edited'),
    ).length;
    const intentAcceptanceRate7d = intentIssued > 0
      ? Math.min(1, intentAccepted / intentIssued)
      : null;

    const intentSetEvents = events.filter((e) => e.eventType === 'IntentSet').reverse();
    const firstActionEvents = events.filter((e) => e.eventType === 'FirstActionStarted').reverse();
    const latencies: number[] = [];
    for (const intentSet of intentSetEvents) {
      const fa = firstActionEvents.find(
        (f) => f.occurredAt > intentSet.occurredAt && f.topicId === intentSet.topicId,
      );
      if (fa) {
        latencies.push((fa.occurredAt.getTime() - intentSet.occurredAt.getTime()) / 60_000);
      }
    }
    latencies.sort((a, b) => a - b);
    const startLatencyMinMedian7d = latencies.length > 0
      ? latencies[Math.floor(latencies.length / 2)]
      : null;

    const replanCount = events.filter((e) => e.eventType === 'Replan').length;
    const replanLoopCount7d = Math.max(0, replanCount);

    const appOpens = events.filter((e) => e.eventType === 'AppOpen').reverse();
    let stateTrend7d: StateTrend = 'flat';
    if (appOpens.length >= 2) {
      const firstEnergy = (appOpens[0].payload as any).energy ?? 3;
      const lastEnergy = (appOpens[appOpens.length - 1].payload as any).energy ?? 3;
      if (lastEnergy - firstEnergy >= 1) stateTrend7d = 'improving';
      else if (firstEnergy - lastEnergy >= 1) stateTrend7d = 'worsening';
    }

    return new StudentAggregates(id, {
      pendingChecks,
      openLoops,
      verificationRate7d,
      scheduleMisses7d,
      avoidantExits7d,
      skipCount7d,
      silenceDays,
      startLatencyMinMedian7d,
      intentAcceptanceRate7d,
      replanLoopCount7d,
      stateTrend7d,
      loopLatencyTrend: null,
    });
  }
}
