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
    // Scene 1 (Day 1): "I'm ready, let's start big" — EI_Storyboard_S7_Day1-21.md
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
    // Scene 2 (Day 2-3): "Busy day, still moving fast" (Day 2) — EI_Storyboard_S7_Day1-21.md
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
    // Scene 2 (Day 2-3): "Busy day, still moving fast" (Day 3, pendingChecks→3) — EI_Storyboard_S7_Day1-21.md
    {
      day: 3,
      description: 'Day 3: Another defer, pendingChecks → 3',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 2, openedAt: '2025-01-03T09:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s7', negotiatedIntentId: 'ni-3', decision: 'accepted', respondedAt: '2025-01-03T09:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'limits',
          payload: { studentId: 'student-s7', topic: 'limits', setAt: '2025-01-03T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'limits',
          payload: { studentId: 'student-s7', topic: 'limits', startedAt: '2025-01-03T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'limits',
          payload: { studentId: 'student-s7', topic: 'limits', endedAt: '2025-01-03T10:00:00Z' },
        },
        {
          eventType: 'RetrievalScheduled',
          topicId: 'limits',
          payload: { studentId: 'student-s7', topic: 'limits', dueAt: '2025-01-04T10:00:00Z', questionsPlanned: 3, tier: 'med', format: 'standard', scheduledAt: '2025-01-03T10:01:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
        { protocol: 3, partialMatch: { verificationDecision: 'ScheduleVerify' } },
      ],
      expectedSignals: {
        pendingChecks: 3,
        openLoops: 3,
        scheduleMisses7d: 2,
      },
    },
    // Scene 3 (Day 4): "First honest mirror" — EI_Storyboard_S7_Day1-21.md
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
        openLoops: 3,
        scheduleMisses7d: 2,
      },
    },
    // Scene 4–5 (Day 5): "Gentle constraint" + "The tiny check moment" — EI_Storyboard_S7_Day1-21.md
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
        openLoops: 1,
        scheduleMisses7d: 1,
        verificationRate7d: { min: 0.5 },
      },
    },
    // Scene 6 (Day 6-7): "Reminders become shorter (24h)" — EI_Storyboard_S7_Day1-21.md
    {
      day: 6,
      description: 'Day 6: pendingChecks 2-3, Neutral or Boost',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 4, pressure: 1, sleepBucket: '>=8', backlogPressure: 2, openedAt: '2025-01-06T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', setAt: '2025-01-06T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', startedAt: '2025-01-06T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', endedAt: '2025-01-06T10:00:00Z' },
        },
        {
          eventType: 'RetrievalScheduled',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', dueAt: '2025-01-07T10:00:00Z', questionsPlanned: 3, tier: 'med', format: 'standard', scheduledAt: '2025-01-06T10:01:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
        { protocol: 3, partialMatch: { verificationDecision: 'ScheduleVerify' } },
      ],
      expectedSignals: {
        pendingChecks: 2,
        openLoops: 2,
      },
    },
    // Scene 7 (Day 8-10): "New routine forms (clear 1, then build)" — EI_Storyboard_S7_Day1-21.md
    {
      day: 9,
      description: 'Day 9: Energy Sharp (5), Boost, clear 1 first',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 1, openedAt: '2025-01-09T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', setAt: '2025-01-09T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', startedAt: '2025-01-09T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', endedAt: '2025-01-09T10:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 1,
        verificationRate7d: { min: 0.7 },
      },
    },
    // Scene 8 (Day 11-12): "Time crunch without breaking trust" — EI_Storyboard_S7_Day1-21.md
    {
      day: 11,
      description: 'Day 11: Energy Okay (3), Neutral, small scope',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 3, pressure: 3, sleepBucket: '7-8', backlogPressure: 2, openedAt: '2025-01-11T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', setAt: '2025-01-11T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', startedAt: '2025-01-11T09:05:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'integration',
          payload: { studentId: 'student-s7', topic: 'integration', endedAt: '2025-01-11T09:45:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 1,
      },
    },
    // Scene 9 (Day 14): "Light personalization (hint only)" — EI_Storyboard_S7_Day1-21.md
    {
      day: 14,
      description: 'Day 14: Energy Sharp (5), Boost, hint only',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 5, pressure: 1, sleepBucket: '>=8', backlogPressure: 1, openedAt: '2025-01-14T09:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 1,
      },
    },
    // Scene 11 (Day 16-18): "Autonomy returns (fewer prompts)" — EI_Storyboard_S7_Day1-21.md
    {
      day: 17,
      description: 'Day 17: Energy Good (4), Boost, bounded checks',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s7', energy: 4, pressure: 1, sleepBucket: '>=8', backlogPressure: 1, openedAt: '2025-01-17T09:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 1,
      },
    },
  ],
};
