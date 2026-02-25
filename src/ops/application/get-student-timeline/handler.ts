/**
 * GetStudentTimelineHandler — implements IGetStudentTimelineUseCase.
 * Fetches events and aggregates from ledger; returns events in chronological order.
 * Per ops-observability-tactical-spec.md and ei-event-ledger-tactical-spec.md (BehavioralTimeline occurred_at ASC).
 */

import type { IGetStudentTimelineUseCase, IGetStudentTimelineDataPort, GetStudentTimelineResult } from './port';
import type { GetStudentTimelineCommand } from './command';

export class GetStudentTimelineHandler implements IGetStudentTimelineUseCase {
  constructor(private readonly dataPort: IGetStudentTimelineDataPort) {}

  async execute(command: GetStudentTimelineCommand): Promise<GetStudentTimelineResult> {
    const limit = clampLimit(command.limit ?? 200);
    const [eventsRaw, aggregates] = await Promise.all([
      this.dataPort.queryEvents(command.studentId, { limit }),
      this.dataPort.getStudentAggregates(command.studentId),
    ]);
    // queryEvents returns DESC; reverse to ASC for chronological timeline
    const events = [...eventsRaw].reverse();
    return { events, aggregates };
  }
}

function clampLimit(value: number): number {
  return Math.min(Math.max(1, value), 500);
}
