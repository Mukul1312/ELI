import { StudentAggregates, type DomainEventSnapshot } from '../../domain/student-aggregates/student-aggregates';
import { StudentAggregatesId } from '../../domain/student-aggregates/value-objects';
import type { IStudentAggregatesRepository } from '../../domain/student-aggregates/repository';
import type { IStudentEventStreamReader } from '../shared/port-student-event-stream-reader';
import type { ITopicStateReader, TopicStateSnapshot as PortTopicState } from '../shared/port-topic-state-reader';
import type { IClock } from '../shared/port-clock';
import type { RecomputeStudentAggregatesCommand } from './command';
import type { IRecomputeStudentAggregatesUseCase, RecomputeStudentAggregatesResult } from './port';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class RecomputeStudentAggregatesHandler implements IRecomputeStudentAggregatesUseCase {
  constructor(
    private readonly repo: IStudentAggregatesRepository,
    private readonly eventReader: IStudentEventStreamReader,
    private readonly topicReader: ITopicStateReader,
    private readonly clock: IClock,
  ) {}

  async execute(command: RecomputeStudentAggregatesCommand): Promise<RecomputeStudentAggregatesResult> {
    const now = command.now ?? this.clock.now();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const graceMs = command.graceMs;

    const [rawEvents, rawTopicStates, latestEvent] = await Promise.all([
      this.eventReader.readEventsForStudentInWindow(command.studentId, sevenDaysAgo),
      this.topicReader.getAllTopicStates(command.studentId),
      this.eventReader.readLatestEvent(command.studentId),
    ]);

    const events: DomainEventSnapshot[] = rawEvents.map((e) => ({
      eventType: e.eventType,
      topicId: e.topicId,
      occurredAt: e.occurredAt,
      payload: e.payload,
    }));

    const topicStates = rawTopicStates.map((t: PortTopicState) => ({
      topicId: t.topicId,
      lastEffortAt: t.lastEffortAt,
      lastRetrievalAt: t.lastRetrievalAt,
      lastScheduledDueAt: t.lastScheduledDueAt,
    }));

    const allTimeLatestEvent: DomainEventSnapshot | null = latestEvent
      ? { eventType: latestEvent.eventType, topicId: latestEvent.topicId, occurredAt: latestEvent.occurredAt, payload: latestEvent.payload }
      : null;

    const id = StudentAggregatesId.create(command.studentId);
    const aggregate = StudentAggregates.recompute(id, {
      now,
      sevenDaysAgo,
      graceMs,
      events,
      topicStates,
      allTimeLatestEvent,
    });

    await this.repo.save(aggregate);

    return {
      studentId: command.studentId,
      ...aggregate.metrics,
    };
  }
}
