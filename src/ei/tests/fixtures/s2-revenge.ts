/**
 * Storyboard S2: The Revenge Planner (Day 1-21)
 *
 * Key behavior: high energy but extreme pressure/anxiety. Plans ambitiously (overreach),
 * then stalls. System must route Rescue, enforce micro-start, keep proof tiny.
 *
 * Source: EI_Storyboard_S2_RevengePlanning_Day1-21.md
 */

import type { StoryboardFixture } from './types';

export const s2RevengeFixture: StoryboardFixture = {
  id: 's2-revenge',
  name: 'S2: Revenge Planner',
  studentId: 'student-s2',
  description: 'High energy + extreme pressure student who over-plans, stalls, then needs micro-start rescue',
  days: [
    // Scene 1–3 (Day 1): "I have to cover it all" + micro-start + proof tiny — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 1,
      description: 'Day 1: High energy but extreme pressure -> P1 Rescue (pressure overrides energy)',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '6-7', highPressureDetected: true, openedAt: '2025-01-01T09:00:00Z' },
        },
        // P1 should route Rescue despite energy=4 because highPressureDetected=true
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s2', negotiatedIntentId: 'ni-1', decision: 'accepted', respondedAt: '2025-01-01T09:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-01T09:02:00Z' },
        },
        // No FirstActionStarted for 20 minutes -> STALLED
        // P2 detects STALLED and issues micro-start
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-01T09:22:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-01T10:00:00Z' },
        },
        // P3: tiny proof (1Q)
        {
          eventType: 'RetrievalVerified',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', questionsAttempted: 1, tier: 'easy', format: 'standard', verifiedAt: '2025-01-01T10:02:00Z', score: 0.5 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue' },
        { protocol: 2, mode: 'Rescue', playId: 'P2-R1' }, // micro-start
        // P3: in real flow, P3 fires at SessionEnd BEFORE RetrievalVerified is emitted.
        // The test asserts P1 and P2 modes; P3 mode tested via integration tests.
      ],
      expectedSignals: {
        pendingChecks: 0,
        verificationRate7d: { min: 0.9 },
      },
    },
    // Scene 4–5 (Day 2): "Pressure is still high, but I can start" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 2,
      description: 'Day 2: Slightly better pressure, student starts faster',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '7-8', highPressureDetected: true, openedAt: '2025-01-02T09:00:00Z' },
        },
        {
          eventType: 'IntentResponse',
          payload: { studentId: 'student-s2', negotiatedIntentId: 'ni-2', decision: 'accepted', respondedAt: '2025-01-02T09:01:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-02T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-02T09:05:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-02T09:45:00Z' },
        },
        {
          eventType: 'RetrievalVerified',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', questionsAttempted: 2, tier: 'easy', format: 'standard', verifiedAt: '2025-01-02T09:47:00Z', score: 0.6 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Rescue' }, // still Rescue due to highPressureDetected
        // P3 not asserted on mode: student already verified inline (RetrievalVerified present),
        // so P3 label is CONFIDENT/NEUTRAL based on healthy aggregates
      ],
      expectedSignals: {
        pendingChecks: 1,
        verificationRate7d: { min: 0.9 },
        stateTrend7d: 'flat',
      },
    },
    // Scene 6 (Day 3-4): "The relapse risk" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 4,
      // V1: energy=4 + no highPressureDetected → Boost (moderate pressure detection requires V3 triggers, Stage 2)
      description: 'Day 4: Relapse risk — moderate pressure not yet detectable (energy 4, Boost in V1)',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '7-8', openedAt: '2025-01-04T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-04T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-04T09:10:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-04T10:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' }, // V1: no moderate pressure detection; Stage 2 will route Neutral via V3 triggers
      ],
      expectedSignals: {
        pendingChecks: 1,
        stateTrend7d: 'flat',
        scheduleMisses7d: 2,
      },
    },
    // Scene 7 (Day 5-7): "Pressure ≠ capacity becomes a habit" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 6,
      description: 'Day 6: Pressure normalizes, Neutral',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '7-8', openedAt: '2025-01-06T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-06T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-06T09:04:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-06T09:45:00Z' },
        },
        {
          eventType: 'RetrievalVerified',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', questionsAttempted: 1, tier: 'easy', format: 'standard', verifiedAt: '2025-01-06T09:47:00Z', score: 0.6 },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        verificationRate7d: { min: 0.8 },
      },
    },
    // Scene 8 (Day 8-10): "Converting guilt into action (practice-first)" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 9,
      description: 'Day 9: Practice-first, energy 4, pressure 3',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '7-8', openedAt: '2025-01-09T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-09T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-09T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-09T10:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 1,
      },
    },
    // Scene 9 (Day 11-12): "When time is short" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 11,
      description: 'Day 11: Time short, energy 3, small scope',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 3, sleepBucket: '7-8', openedAt: '2025-01-11T21:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-11T21:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-11T21:05:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-11T21:30:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Neutral' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        scheduleMisses7d: 1,
      },
    },
    // Scene 11 (Day 16-18): "Autonomy returns" — EI_Storyboard_S2_RevengePlanning_Day1-21.md
    {
      day: 17,
      description: 'Day 17: Calm, stable, Boost',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, sleepBucket: '>=8', openedAt: '2025-01-17T09:00:00Z' },
        },
        {
          eventType: 'IntentSet',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', setAt: '2025-01-17T09:02:00Z' },
        },
        {
          eventType: 'FirstActionStarted',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', startedAt: '2025-01-17T09:03:00Z' },
        },
        {
          eventType: 'SessionEnd',
          topicId: 'physics-mechanics',
          payload: { studentId: 'student-s2', topic: 'physics-mechanics', endedAt: '2025-01-17T10:00:00Z' },
        },
      ],
      expectedOutputs: [
        { protocol: 1, mode: 'Boost' },
      ],
      expectedSignals: {
        pendingChecks: 1,
        openLoops: 0,
      },
    },
  ],
};
