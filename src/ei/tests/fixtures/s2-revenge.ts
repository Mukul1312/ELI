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
    {
      day: 1,
      description: 'Day 1: High energy but extreme pressure -> P1 Rescue (pressure overrides energy)',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, pressure: 5, sleepBucket: '6-7', backlogPressure: 4, openedAt: '2025-01-01T09:00:00Z' },
        },
        // P1 should route Rescue despite energy=4 because pressure=5
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
    {
      day: 2,
      description: 'Day 2: Slightly better pressure, student starts faster',
      events: [
        {
          eventType: 'AppOpen',
          payload: { studentId: 'student-s2', energy: 4, pressure: 4, sleepBucket: '7-8', backlogPressure: 3, openedAt: '2025-01-02T09:00:00Z' },
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
        { protocol: 1, mode: 'Rescue' }, // still Rescue due to pressure=4
        // P3 not asserted on mode: student already verified inline (RetrievalVerified present),
        // so P3 label is CONFIDENT/NEUTRAL based on healthy aggregates
      ],
      expectedSignals: {
        verificationRate7d: { min: 0.9 },
        stateTrend7d: 'flat',
      },
    },
  ],
};
