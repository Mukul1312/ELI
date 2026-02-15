/**
 * Signal Compute tools: computeAggregates, checkOverdueSchedules, listStudents
 *
 * computeAggregates queries ei_events with rolling 7d windows and computes all
 * derived signals from EI_Engine_Taxonomy.md section 2.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';
import { SCHEDULE_GRACE_HOURS, SILENCE_DAYS_THRESHOLD } from '../../ei/engine/tunables';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
  execute: async (input) => {
    const { studentId } = input;
    const db = (globalThis as any).__eiDb;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

    // Fetch all events in the 7d window
    const events = await Q.queryEvents(db, studentId, { since: sevenDaysAgo });
    const topicStates = await Q.getAllTopicStates(db, studentId);

    // --- pendingChecks: topics where last_effort_at > last_retrieval_at ---
    const pendingChecks = topicStates.filter(
      (t) => t.last_effort_at && (!t.last_retrieval_at || t.last_effort_at > t.last_retrieval_at)
    ).length;

    // --- openLoops: subset of pendingChecks that are overdue ---
    const graceMs = SCHEDULE_GRACE_HOURS * 60 * 60 * 1000;
    const openLoops = topicStates.filter((t) => {
      if (!t.last_scheduled_due_at) return false;
      const dueAt = new Date(t.last_scheduled_due_at).getTime();
      const retrievedAt = t.last_retrieval_at ? new Date(t.last_retrieval_at).getTime() : 0;
      return dueAt + graceMs < now.getTime() && retrievedAt < dueAt;
    }).length;

    // --- verificationRate7d ---
    const sessionEnds7d = events.filter((e) => e.event_type === 'SessionEnd').length;
    const verified7d = events.filter(
      (e) => e.event_type === 'RetrievalVerified' || e.event_type === 'VerificationCompleted'
    ).length;
    const scheduled7d = events.filter((e) => e.event_type === 'RetrievalScheduled').length;
    const verificationRate7d = sessionEnds7d > 0
      ? (verified7d + scheduled7d) / sessionEnds7d
      : 1.0;

    // --- scheduleMisses7d ---
    const scheduleMisses7d = topicStates.filter((t) => {
      if (!t.last_scheduled_due_at) return false;
      const dueAt = new Date(t.last_scheduled_due_at).getTime();
      const retrievedAt = t.last_retrieval_at ? new Date(t.last_retrieval_at).getTime() : 0;
      return dueAt >= sevenDaysAgo.getTime() && dueAt + graceMs < now.getTime() && retrievedAt < dueAt;
    }).length;

    // --- avoidantExits7d ---
    const sessionEndEvents = events.filter((e) => e.event_type === 'SessionEnd');
    const verifiedTopics = new Set(
      events.filter((e) => ['RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted'].includes(e.event_type))
        .map((e) => `${e.topic_id}:${e.occurred_at.toISOString().slice(0, 10)}`)
    );
    const avoidantExits7d = sessionEndEvents.filter((se) => {
      const key = `${se.topic_id}:${se.occurred_at.toISOString().slice(0, 10)}`;
      return !verifiedTopics.has(key);
    }).length;

    // --- skipCount7d ---
    const skipCount7d = events.filter((e) => e.event_type === 'RetrievalSkipped').length;

    // --- silenceDays ---
    const meaningfulTypes = ['IntentSet', 'SessionEnd', 'RetrievalVerified', 'VerificationCompleted'];
    const allEvents = await Q.queryEvents(db, studentId, { limit: 1 }); // most recent
    const lastMeaningful = events.filter((e) => meaningfulTypes.includes(e.event_type))[0];
    const silenceDays = lastMeaningful
      ? Math.floor((now.getTime() - new Date(lastMeaningful.occurred_at).getTime()) / (24 * 60 * 60 * 1000))
      : (allEvents.length > 0 ? Math.floor((now.getTime() - new Date(allEvents[0].occurred_at).getTime()) / (24 * 60 * 60 * 1000)) : 0);

    // --- intentAcceptanceRate7d ---
    const intentIssued = events.filter((e) => e.event_type === 'NegotiatedIntentIssued').length;
    const intentAccepted = events.filter(
      (e) => e.event_type === 'IntentResponse' &&
        ((e.payload as any).decision === 'accepted' || (e.payload as any).decision === 'edited')
    ).length;
    const intentAcceptanceRate7d = intentIssued > 0 ? intentAccepted / intentIssued : null;

    // --- startLatencyMinMedian7d (simplified: average of available latencies) ---
    const intentSetEvents = events.filter((e) => e.event_type === 'IntentSet').reverse();
    const firstActionEvents = events.filter((e) => e.event_type === 'FirstActionStarted').reverse();
    const latencies: number[] = [];
    for (const is of intentSetEvents) {
      const fa = firstActionEvents.find(
        (f) => f.occurred_at > is.occurred_at && f.topic_id === is.topic_id
      );
      if (fa) {
        latencies.push((new Date(fa.occurred_at).getTime() - new Date(is.occurred_at).getTime()) / 60_000);
      }
    }
    latencies.sort((a, b) => a - b);
    const startLatencyMinMedian7d = latencies.length > 0
      ? latencies[Math.floor(latencies.length / 2)]
      : null;

    // --- replanLoopCount7d ---
    const replanLoopCount7d = events.filter((e) => e.event_type === 'Replan').length >= 2
      ? events.filter((e) => e.event_type === 'Replan').length
      : 0;

    // --- stateTrend7d (simplified: based on energy from AppOpen events) ---
    const appOpens = events.filter((e) => e.event_type === 'AppOpen').reverse();
    let stateTrend7d: 'improving' | 'flat' | 'worsening' = 'flat';
    if (appOpens.length >= 2) {
      const firstEnergy = (appOpens[0].payload as any).energy ?? 3;
      const lastEnergy = (appOpens[appOpens.length - 1].payload as any).energy ?? 3;
      if (lastEnergy - firstEnergy >= 1) stateTrend7d = 'improving';
      else if (firstEnergy - lastEnergy >= 1) stateTrend7d = 'worsening';
    }

    const result = {
      studentId,
      pendingChecks,
      openLoops,
      verificationRate7d: Math.min(1, verificationRate7d),
      scheduleMisses7d,
      avoidantExits7d,
      skipCount7d,
      silenceDays,
      startLatencyMinMedian7d: startLatencyMinMedian7d,
      intentAcceptanceRate7d,
      replanLoopCount7d,
      stateTrend7d,
      loopLatencyTrend: null as string | null,
    };

    // Persist
    await Q.upsertAggregates(db, studentId, {
      pending_checks: pendingChecks,
      open_loops: openLoops,
      verification_rate_7d: result.verificationRate7d,
      schedule_misses_7d: scheduleMisses7d,
      avoidant_exits_7d: avoidantExits7d,
      skip_count_7d: skipCount7d,
      silence_days: silenceDays,
      start_latency_min_median_7d: startLatencyMinMedian7d,
      intent_acceptance_rate_7d: intentAcceptanceRate7d,
      replan_loop_count_7d: replanLoopCount7d,
      state_trend_7d: stateTrend7d,
      loop_latency_trend: null,
    });

    return result;
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
  execute: async (input) => {
    const { studentId, graceHours } = input;
    const db = (globalThis as any).__eiDb;
    const now = new Date();
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
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const studentIds = await Q.listActiveStudents(db, input.activeWithinDays);
    return { studentIds };
  },
});
