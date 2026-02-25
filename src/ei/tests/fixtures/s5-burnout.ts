/**
 * Storyboard S5: Burnout Runway (Day 1-21)
 *
 * Key behavior: extremely low energy, sleep-deprived, high pressure. Ignores intent,
 * goes silent for days, then re-engages. System must use do-no-harm guardrail:
 * Rescue mode with gentle recovery, NOT volume tightening.
 *
 * Source: EI_Storyboard_S5_BurnoutRunway_Day1-21.md
 */

import type { StoryboardFixture } from './types';

export const s5BurnoutFixture: StoryboardFixture = {
  id: 's5-burnout',
  name: 'S5: Burnout Runway',
  studentId: 'student-s5',
  description: 'Low energy, sleep-deprived student who goes silent, then gentle recovery with do-no-harm guardrail',
  days: [
    // Scene 1 (Day 1): "Crash and ignore" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 1,
      description: 'Day 1: Extremely low state -> P1 Rescue MVW, student ignores intent',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 2, pressure: 4, sleepBucket: '<6', backlogPressure: 5, openedAt: '2025-01-01T22:00:00Z' },
        },
        // P1 should route Rescue MVW (minimum viable win)
        // Student ignores the intent
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-1', decision: 'ignored', respondedAt: '2025-01-01T22:30:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue', playId: 'P1-R1' },
      ],
      expectedSignals: {
        silenceDays: { min: 0, max: 0 },
      },
    },
    // Scene 4–5 (Day 4): "Re-engagement" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 4,
      description: 'Day 4: Student re-engages after 3 days silence, do-no-harm guardrail active',
      events: [
        // Days 2-3: no events -> silenceDays increments to 3
        // Day 4: student opens app
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 2, pressure: 3, sleepBucket: '6-7', backlogPressure: 4, openedAt: '2025-01-04T20:00:00Z' },
        },
        // P1 should route Rescue with gentle recovery
        // (do-no-harm: NOT volume tightening despite high openLoops)
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-2', decision: 'accepted', respondedAt: '2025-01-04T20:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-04T20:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', startedAt: '2025-01-04T20:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', endedAt: '2025-01-04T20:25:00Z' },
        },
        // P3 Rescue: tiny proof or schedule
        {
          eventType: 'RetrievalVerified',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', questionsAttempted: 1, tier: 'easy', format: 'standard', verifiedAt: '2025-01-04T20:27:00Z', score: 0.4 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue' },
        // P3: student verified inline (RetrievalVerified present) so P3 sees
        // hasRetrieval=true; mode depends on aggregates not just current session
      ],
      expectedSignals: {
        silenceDays: { min: 0, max: 0 }, // resets after re-engagement
        stateTrend7d: 'worsening',
        pendingChecks: 0,
      },
    },
    // Scene 6 (Day 5-7): "Protect sleep" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 6,
      description: 'Day 6: Protect sleep, still low energy (2-3), Rescue',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 2, pressure: 3, sleepBucket: '6-7', backlogPressure: 4, openedAt: '2025-01-06T20:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-2b', decision: 'accepted', respondedAt: '2025-01-06T20:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-06T20:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', startedAt: '2025-01-06T20:05:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', endedAt: '2025-01-06T20:30:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue' },
      ],
      expectedSignals: {
        silenceDays: { min: 0, max: 0 },
        stateTrend7d: 'worsening',
      },
    },
    // Scene 6–7 (Day 7): "Gradual improvement" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 7,
      description: 'Day 7: Gradual improvement, state stabilizes',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 3, pressure: 3, sleepBucket: '7-8', backlogPressure: 3, openedAt: '2025-01-07T19:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-3', decision: 'accepted', respondedAt: '2025-01-07T19:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-07T19:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', startedAt: '2025-01-07T19:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', endedAt: '2025-01-07T19:40:00Z' },
        },
        {
          eventType: 'RetrievalVerified',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', questionsAttempted: 2, tier: 'easy', format: 'standard', verifiedAt: '2025-01-07T19:42:00Z', score: 0.6 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' }, // energy=3, pressure=3, sleep='7-8' — no LOW_ENERGY trigger; worsening trend caps at Neutral (not Rescue)
      ],
      expectedSignals: {
        silenceDays: { min: 0, max: 0 },
        verificationRate7d: { min: 0.5 },
        stateTrend7d: 'flat',
        pendingChecks: 0,
      },
    },
    // Scene 7 (Day 8-10): "Pending bounded (one check first)" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 9,
      description: 'Day 9: Pending bounded, energy 3, Neutral',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 3, pressure: 2, sleepBucket: '7-8', backlogPressure: 2, openedAt: '2025-01-09T19:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-4', decision: 'accepted', respondedAt: '2025-01-09T19:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-09T19:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', startedAt: '2025-01-09T19:04:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', endedAt: '2025-01-09T19:40:00Z' },
        },
        {
          eventType: 'RetrievalVerified',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', questionsAttempted: 1, tier: 'easy', format: 'standard', verifiedAt: '2025-01-09T19:42:00Z', score: 0.6 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 0,
        verificationRate7d: { min: 0.6 },
      },
    },
    // Scene 8 (Day 11-12): "Skipping (Fatigue)" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 11,
      description: 'Day 11: Skip due to fatigue, energy 2, Rescue',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 2, pressure: 3, sleepBucket: '6-7', backlogPressure: 3, openedAt: '2025-01-11T21:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s5', negotiatedIntentId: 'ni-5', decision: 'accepted', respondedAt: '2025-01-11T21:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-11T21:02:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue' },
      ],
      expectedSignals: {
        pendingChecks: 1,
      },
    },
    // Scene 9 (Day 14): "Light personalization (hint only)" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 14,
      description: 'Day 14: Personalization hint, energy 3, Neutral',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 3, pressure: 2, sleepBucket: '7-8', backlogPressure: 2, openedAt: '2025-01-14T19:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 1,
      },
    },
    // Scene 11 (Day 16-18): "Autonomy (recovery complete)" — EI_Storyboard_S5_BurnoutRunway_Day1-21.md
    {
      day: 17,
      description: 'Day 17: Recovery complete, energy 4, Boost',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s5', energy: 4, pressure: 1, sleepBucket: '>=8', backlogPressure: 1, openedAt: '2025-01-17T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', setAt: '2025-01-17T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', startedAt: '2025-01-17T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'chemistry-organic',
          payload: { studentId: 'student-s5', topic: 'chemistry-organic', endedAt: '2025-01-17T10:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
      ],
      expectedSignals: {
        pendingChecks: 0,
        openLoops: 0,
      },
    },
  ],
};
