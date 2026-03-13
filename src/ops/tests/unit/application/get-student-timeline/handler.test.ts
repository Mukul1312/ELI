/**
 * GetStudentTimelineHandler unit tests.
 * Verifies chronological ordering (occurred_at ASC) and limit clamping.
 */


import { describe, it, expect } from 'vitest';
import { GetStudentTimelineHandler } from '../../../../application/get-student-timeline/handler';
import type { IGetStudentTimelineDataPort } from '../../../../application/get-student-timeline/port';
import type { QueriedEvent } from '@/ei/application/shared/port-query-events';

describe('GetStudentTimelineHandler', () => {
  it('returns events in chronological order (occurred_at ASC)', async () => {
    const t1 = new Date('2025-01-01T10:00:00Z');
    const t2 = new Date('2025-01-01T11:00:00Z');
    const t3 = new Date('2025-01-01T12:00:00Z');

    const eventsDesc: QueriedEvent[] = [
      { id: 'e3', eventType: 'X', topicId: null, payload: {}, occurredAt: t3 },
      { id: 'e2', eventType: 'X', topicId: null, payload: {}, occurredAt: t2 },
      { id: 'e1', eventType: 'X', topicId: null, payload: {}, occurredAt: t1 },
    ];

    const adapter: IGetStudentTimelineDataPort = {
      queryEvents: async () => eventsDesc,
      queryBySessionId: async () => null,
      getStudentAggregates: async () => null,
    };

    const handler = new GetStudentTimelineHandler(adapter);
    const result = await handler.execute({ studentId: 's1', limit: 10 });

    expect(result.events).toHaveLength(3);
    expect(result.events[0].id).toBe('e1');
    expect(result.events[0].occurredAt).toEqual(t1);
    expect(result.events[1].id).toBe('e2');
    expect(result.events[2].id).toBe('e3');
    expect(result.events[2].occurredAt).toEqual(t3);
  });

  it('clamps limit to 1-500', async () => {
    const receivedLimits: number[] = [];
    const adapter: IGetStudentTimelineDataPort = {
      queryEvents: async (_studentId, filter) => {
        receivedLimits.push(filter.limit ?? 0);
        return [];
      },
      queryBySessionId: async () => null,
      getStudentAggregates: async () => null,
    };

    const handler = new GetStudentTimelineHandler(adapter);

    await handler.execute({ studentId: 's1', limit: 0 });
    expect(receivedLimits[0]).toBe(1);

    await handler.execute({ studentId: 's1', limit: 1000 });
    expect(receivedLimits[1]).toBe(500);

    await handler.execute({ studentId: 's1' });
    expect(receivedLimits[2]).toBe(200);
  });
});
