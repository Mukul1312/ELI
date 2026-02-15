/**
 * Storyboard S7: The Ambitious Subject-Switcher (Day 1-21)
 *
 * Key behavior: high energy, switches subjects frequently, defers verification,
 * eventually accumulates pendingChecks/openLoops until system enforces close-loops.
 *
 * Source: EI_Storyboard_S7_Day1-21.md
 */

import type { StoryboardFixture } from './types';

export const s7AmbitiousFixture: StoryboardFixture = {
  id: 's7-ambitious',
  name: 'S7: Ambitious Subject-Switcher',
  studentId: 'student-s7',
  description: 'High energy student who switches subjects and defers verification, triggering close-loops constraints',
  days: [
    {
      day: 1,
      description: 'Day 1: High energy AppOpen, defers verification',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 1, openedAt: '2025-01-01T09:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s7', negotiatedIntentId: 'ni-1', decision: 'accepted', respondedAt: '2025-01-01T09:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', setAt: '2025-01-01T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', startedAt: '2025-01-01T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', endedAt: '2025-01-01T10:00:00Z' },
        },
        // Student defers -> ScheduleVerify(24h)
        {
          eventType: 'RetrievalScheduled',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', dueAt: '2025-01-02T10:00:00Z', questionsPlanned: 3, tier: 'med', format: 'standard', scheduledAt: '2025-01-01T10:01:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
        { protocol: 3, partialMatch: { verificationDecision: 'ScheduleVerify' } },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 0,
      },
    },
    {
      day: 2,
      description: 'Day 2: Switches to new topic, defers again',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 2, openedAt: '2025-01-02T09:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s7', negotiatedIntentId: 'ni-2', decision: 'accepted', respondedAt: '2025-01-02T09:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'differentiation',
          payload: { studentId: 'student-s7', topic: 'differentiation', setAt: '2025-01-02T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'differentiation',
          payload: { studentId: 'student-s7', topic: 'differentiation', startedAt: '2025-01-02T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'differentiation',
          payload: { studentId: 'student-s7', topic: 'differentiation', endedAt: '2025-01-02T10:00:00Z' },
        },
        {
          eventType: 'RetrievalScheduled',
          topicId: 'differentiation',
          payload: { studentId: 'student-s7', topic: 'differentiation', dueAt: '2025-01-03T10:00:00Z', questionsPlanned: 3, tier: 'med', format: 'standard', scheduledAt: '2025-01-02T10:01:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1 },
        { protocol: 3, partialMatch: { verificationDecision: 'ScheduleVerify' } },
      ],
      expectedSignals: {
        pendingChecks: 2,
      },
    },
    {
      day: 4,
      description: 'Day 4: 3 pendingChecks, P1 enforces close-loops constraint',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 3, openedAt: '2025-01-04T09:00:00Z' },
        },
      ],
      expectedOutputs: [
        {
          protocol: 1,
          mode: 'Neutral',
          partialMatch: {
            constraints: { closeOpenLoopFirst: true },
          },
        },
      ],
      expectedSignals: {
        pendingChecks: 3,
        scheduleMisses7d: 2,
      },
    },
    {
      day: 5,
      description: 'Day 5: Student honors verification, openLoops decrease',
      events: [
        {
          eventType: 'VerificationCompleted',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', completedAt: '2025-01-05T09:00:00Z', result: { questionsAttempted: 3, score: 0.7 } },
        },
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 2, openedAt: '2025-01-05T09:30:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', endedAt: '2025-01-05T10:30:00Z' },
        },
        {
          eventType: 'RetrievalVerified',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', questionsAttempted: 3, tier: 'med', format: 'standard', verifiedAt: '2025-01-05T10:31:00Z', score: 0.8 },
        },
      ],
      expectedOutputs: [
        { protocol: 3, partialMatch: { verificationDecision: 'VerifyNow' } },
      ],
      expectedSignals: {
        pendingChecks: 1,
        verificationRate7d: { min: 0.5 },
      },
    },
  ],
};
