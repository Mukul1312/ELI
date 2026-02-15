/**
 * TMS Store tools: getTopicState, getAllTopicStates, updateTMS
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';

const topicStateOutput = z.object({
  studentId: z.string(),
  topicId: z.string(),
  topicStep: z.string().nullable(),
  lastEffortAt: z.string().nullable(),
  lastRetrievalAt: z.string().nullable(),
  lastScheduledDueAt: z.string().nullable(),
  tms: z.number(),
  deltaDecay: z.number(),
  updatedAt: z.string(),
});

function formatRow(r: Q.TopicStateRow) {
  return {
    studentId: r.student_id,
    topicId: r.topic_id,
    topicStep: r.topic_step,
    lastEffortAt: r.last_effort_at?.toISOString() ?? null,
    lastRetrievalAt: r.last_retrieval_at?.toISOString() ?? null,
    lastScheduledDueAt: r.last_scheduled_due_at?.toISOString() ?? null,
    tms: r.tms,
    deltaDecay: r.delta_decay,
    updatedAt: r.updated_at.toISOString(),
  };
}

export const getTopicStateTool = createTool({
  id: 'get-topic-state',
  description: 'Read topic state for a student + topic',
  inputSchema: z.object({
    studentId: z.string(),
    topicId: z.string(),
  }),
  outputSchema: topicStateOutput.nullable(),
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const row = await Q.getTopicState(db, input.studentId, input.topicId);
    return row ? formatRow(row) : null;
  },
});

export const getAllTopicStatesTool = createTool({
  id: 'get-all-topic-states',
  description: 'Read all topic states for a student',
  inputSchema: z.object({
    studentId: z.string(),
  }),
  outputSchema: z.object({
    topics: z.array(topicStateOutput),
  }),
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const rows = await Q.getAllTopicStates(db, input.studentId);
    return { topics: rows.map(formatRow) };
  },
});

export const updateTMSTool = createTool({
  id: 'update-tms',
  description: 'Update Topic Mastery Score after retrieval is verified',
  inputSchema: z.object({
    studentId: z.string(),
    topicId: z.string(),
    tms: z.number().min(0).max(1),
    deltaDecay: z.number(),
  }),
  outputSchema: topicStateOutput,
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const row = await Q.upsertTopicState(db, input.studentId, input.topicId, {
      tms: input.tms,
      delta_decay: input.deltaDecay,
      last_retrieval_at: new Date(),
    });
    return formatRow(row);
  },
});
