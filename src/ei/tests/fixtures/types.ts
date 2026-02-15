/**
 * Shared types for storyboard test fixtures.
 */

export interface FixtureEvent {
  eventType: string;
  topicId?: string;
  payload: Record<string, unknown>;
  /** ISO datetime string or relative "+Xh" from day start */
  occurredAt?: string;
}

export interface ExpectedOutput {
  protocol: 1 | 2 | 3 | 'SA';
  mode?: 'Rescue' | 'Neutral' | 'Boost';
  playId?: string;
  /** Partial match on the output contract */
  partialMatch?: Record<string, unknown>;
}

export interface ExpectedSignals {
  pendingChecks?: number;
  openLoops?: number;
  verificationRate7d?: { min?: number; max?: number };
  silenceDays?: { min?: number; max?: number };
  scheduleMisses7d?: number;
  stateTrend7d?: 'improving' | 'flat' | 'worsening';
}

export interface FixtureDay {
  day: number;
  description: string;
  events: FixtureEvent[];
  expectedOutputs: ExpectedOutput[];
  expectedSignals?: ExpectedSignals;
}

export interface StoryboardFixture {
  id: string;
  name: string;
  studentId: string;
  description: string;
  days: FixtureDay[];
}
