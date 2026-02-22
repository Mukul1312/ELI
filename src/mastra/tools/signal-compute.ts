/**
 * Signal Compute tools: computeAggregates, checkOverdueSchedules, listStudents
 *
 * computeAggregates queries ei_events with rolling 7d windows and computes all
 * derived signals from EI_Engine_Taxonomy.md section 2.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';
import { SCHEDULE_GRACE_HOURS } from '../../ei/engine/tunables';
import { RecomputeStudentAggregatesHandler } from '../../ei/application/recompute-student-aggregates/handler';
import { PostgresStudentAggregatesRepository } from '../../ei/infrastructure/persistence/student-aggregates-repository.pg';
import { PostgresStudentEventStreamReader } from '../../ei/infrastructure/persistence/student-event-stream-reader.pg';
import { PostgresTopicStateReader } from '../../ei/infrastructure/persistence/topic-state-reader.pg';
import { getClock } from '../../ei/runtime/clock';
import { getEiDb } from '../../ei/runtime/db';

export const computeAggregatesTool = createTool({
  id: 'compute-aggregates',
  description: 'Recompute all derived signals for a student from the event log',
  inputSchema: z.object({
    studentId: z.string(),
  }),
  outputSchema: z.object({
    studentId: z.string(),
    pendingChecks: z.number(),
    openLoops: z.number(),
    verificationRate7d: z.number(),
    scheduleMisses7d: z.number(),
    avoidantExits7d: z.number(),
    skipCount7d: z.number(),
    silenceDays: z.number(),
    startLatencyMinMedian7d: z.number().nullable(),
    intentAcceptanceRate7d: z.number().nullable(),
    replanLoopCount7d: z.number(),
    stateTrend7d: z.string(),
    loopLatencyTrend: z.string().nullable(),
  }),
  execute: async (input, context) => {
    const db = getEiDb(context);
    const clock = getClock(context);

    const repo = new PostgresStudentAggregatesRepository(db);
    const eventReader = new PostgresStudentEventStreamReader(db);
    const topicReader = new PostgresTopicStateReader(db);

    const graceMs = SCHEDULE_GRACE_HOURS * 60 * 60 * 1000;
    const handler = new RecomputeStudentAggregatesHandler(repo, eventReader, topicReader, clock);
    return handler.execute({ studentId: input.studentId, graceMs });
  },
});

export const checkOverdueSchedulesTool = createTool({
  id: 'check-overdue-schedules',
  description: 'Scan for overdue scheduled verifications',
  inputSchema: z.object({
    studentId: z.string().optional(),
    graceHours: z.number().default(SCHEDULE_GRACE_HOURS),
  }),
  outputSchema: z.object({
    overdue: z.array(z.object({
      studentId: z.string(),
      topicId: z.string(),
      scheduledDueAt: z.string(),
      hoursOverdue: z.number(),
    })),
  }),
  execute: async (input, context) => {
    const { studentId, graceHours } = input;
    const db = getEiDb(context);
    const now = getClock(context).now();
    const graceMs = graceHours * 60 * 60 * 1000;

    let states: Q.TopicStateRow[];
    if (studentId) {
      states = await Q.getAllTopicStates(db, studentId);
    } else {
      states = await db.any('SELECT * FROM ei_topic_state WHERE last_scheduled_due_at IS NOT NULL');
    }

    const overdue = states
      .filter((t) => {
        if (!t.last_scheduled_due_at) return false;
        const dueAt = new Date(t.last_scheduled_due_at).getTime();
        const retrievedAt = t.last_retrieval_at ? new Date(t.last_retrieval_at).getTime() : 0;
        return dueAt + graceMs < now.getTime() && retrievedAt < dueAt;
      })
      .map((t) => ({
        studentId: t.student_id,
        topicId: t.topic_id,
        scheduledDueAt: new Date(t.last_scheduled_due_at!).toISOString(),
        hoursOverdue: Math.round(
          (now.getTime() - new Date(t.last_scheduled_due_at!).getTime() - graceMs) / (60 * 60 * 1000)
        ),
      }));

    return { overdue };
  },
});

export const listStudentsTool = createTool({
  id: 'list-students',
  description: 'List all distinct student IDs active within a window',
  inputSchema: z.object({
    activeWithinDays: z.number().int().default(30),
  }),
  outputSchema: z.object({
    studentIds: z.array(z.string()),
  }),
  execute: async (input, context) => {
    const db = getEiDb(context);
    const studentIds = await Q.listActiveStudents(db, input.activeWithinDays);
    return { studentIds };
  },
});
