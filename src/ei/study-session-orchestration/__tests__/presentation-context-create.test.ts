/**
 * PresentationContext.create() factory — domain validation tests.
 *
 * Per tactical spec §10 finding #2: validates mode, pendingChecks, verificationRate7d, sessionsLast7d.
 * Per ADR-005 §C6: throws domain errors, does not clamp.
 */

import { describe, it, expect } from 'vitest';
import { createPresentationContext, type PresentationContext } from '../domain/value-objects/presentation-context';

function validCtx(overrides: Partial<PresentationContext> = {}): PresentationContext {
  return {
    studentId: 'student-1',
    topicId: 'topic-1',
    mode: 'Neutral',
    playId: 'P1-N1',
    stateScore: 3,
    pendingChecks: 0,
    silenceDays: 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: 3,
    highPressureDetected: false,
    closeOpenLoopFirst: false,
    verificationRate7d: 0.5,
    stateTrend7d: 'flat',
    sessionsLast7d: 2,
    loopsClosedLast7d: 1,
    sessionsTotal: 10,
    topicStates: [],
    lastIdentityShownAt: null,
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
    hasPriorOpen: true,
    dropoutSignalActive: false,
    nextPendingTopic: null,
    ...overrides,
  };
}

describe('createPresentationContext()', () => {
  it('passes through valid input', () => {
    const input = validCtx();
    const result = createPresentationContext(input);
    expect(result.mode).toBe('Neutral');
    expect(result.pendingChecks).toBe(0);
  });

  it('accepts all valid modes', () => {
    for (const mode of ['Rescue', 'Neutral', 'Boost'] as const) {
      expect(() => createPresentationContext(validCtx({ mode }))).not.toThrow();
    }
  });

  it('throws for invalid mode', () => {
    expect(() =>
      createPresentationContext(validCtx({ mode: 'Invalid' as any })),
    ).toThrow('mode must be one of');
  });

  it('throws for negative pendingChecks', () => {
    expect(() =>
      createPresentationContext(validCtx({ pendingChecks: -1 })),
    ).toThrow('pendingChecks');
  });

  it('throws for verificationRate7d < 0', () => {
    expect(() =>
      createPresentationContext(validCtx({ verificationRate7d: -0.1 })),
    ).toThrow('verificationRate7d');
  });

  it('throws for verificationRate7d > 1', () => {
    expect(() =>
      createPresentationContext(validCtx({ verificationRate7d: 1.5 })),
    ).toThrow('verificationRate7d');
  });

  it('throws for negative sessionsLast7d', () => {
    expect(() =>
      createPresentationContext(validCtx({ sessionsLast7d: -1 })),
    ).toThrow('sessionsLast7d');
  });

  it('throws for negative sessionsTotal', () => {
    expect(() =>
      createPresentationContext(validCtx({ sessionsTotal: -1 })),
    ).toThrow('sessionsTotal');
  });

  it('accepts edge values: 0 and 1 for verificationRate7d', () => {
    expect(() => createPresentationContext(validCtx({ verificationRate7d: 0 }))).not.toThrow();
    expect(() => createPresentationContext(validCtx({ verificationRate7d: 1 }))).not.toThrow();
  });
});
