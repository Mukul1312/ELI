/**
 * Event Store tools: appendEvent + queryEvents
 *
 * appendEvent writes to ei_events and updates ei_topic_state for relevant event types.
 * queryEvents reads raw event history for workflow logic.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { EventTypeEnum } from '../../ei/schemas/events';
import { validateEventPayload } from '../../ei/schemas/validate-event-payload';
import * as Q from '../../ei/db/queries';
import { getEiDb } from '../../ei/runtime/db';
import { isTopicLoopEventType } from '../../ei/domain/topic-loop/events';
import { PostgresTopicLoopRepository } from '../../ei/infrastructure/persistence/topic-loop-repository.pg';
import { ApplyEventToTopicLoopHandler } from '../../ei/application/apply-event-to-topic-loop/handler';

export const appendEventTool = createTool({
  id: 'append-event',
  description: 'Append an event to ei_events and update ei_topic_state when relevant',
  inputSchema: z.object({
    studentId: z.string(),
    eventType: EventTypeEnum,
    topicId: z.string().optional(),
    payload: z.record(z.unknown()).default({}),
    occurredAt: z.string().datetime().optional(),
  }),
  outputSchema: z.object({
    eventId: z.string(),
    occurredAt: z.string(),
  }),
  execute: async (input, context) => {
    const { studentId, eventType, topicId, payload, occurredAt } = input;
    const db = getEiDb(context);

    const validatedPayload = validateEventPayload(eventType, payload as Record<string, unknown>);

    const row = await Q.insertEvent(
      db,
      studentId,
      eventType,
      topicId ?? null,
      validatedPayload,
      occurredAt ? new Date(occurredAt) : undefined,
    );

    if (topicId && isTopicLoopEventType(eventType)) {
      const repo = new PostgresTopicLoopRepository(db);
      const handler = new ApplyEventToTopicLoopHandler(repo);
      await handler.execute({
        studentId,
        topicId,
        eventType,
        payload: validatedPayload,
      });
    }

    return {
      eventId: row.id,
      occurredAt: row.occurred_at.toISOString(),
    };
  },
});

export const queryEventsTool = createTool({
  id: 'query-events',
  description: 'Query raw event history for a student with optional filters',
  inputSchema: z.object({
    studentId: z.string(),
    filters: z.object({
      eventTypes: z.array(z.string()).optional(),
      topicId: z.string().optional(),
      since: z.string().datetime().optional(),
      until: z.string().datetime().optional(),
      limit: z.number().int().optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    events: z.array(z.object({
      id: z.string(),
      eventType: z.string(),
      topicId: z.string().nullable(),
      payload: z.record(z.unknown()),
      occurredAt: z.string(),
    })),
  }),
  execute: async (input, context) => {
    const { studentId, filters } = input;
    const db = getEiDb(context);

    const rows = await Q.queryEvents(db, studentId, {
      eventTypes: filters?.eventTypes,
      topicId: filters?.topicId,
      since: filters?.since ? new Date(filters.since) : undefined,
      until: filters?.until ? new Date(filters.until) : undefined,
      limit: filters?.limit,
    });

    return {
      events: rows.map((r) => ({
        id: r.id,
        eventType: r.event_type,
        topicId: r.topic_id,
        payload: r.payload,
        occurredAt: r.occurred_at.toISOString(),
      })),
    };
  },
});
