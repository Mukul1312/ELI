/**
 * FlowStrategy + FlowTemplate + FlowSelectionContext — pure domain unit tests.
 *
 * Per tactical spec §13: "Domain services: unit, no mocks."
 * Per ADR-005 §C7: lock-down tests + forward-compatibility tests + validation tests.
 */

import { describe, it, expect } from 'vitest';
import { FlowStrategy } from '../domain/services/flow-strategy';
import { FlowTemplate } from '../domain/value-objects/flow-template';
import { FlowSelectionContext, type FlowSelectionContextInput } from '../domain/value-objects/flow-selection-context';

// ── Helper: minimal valid input ──

function validInput(overrides: Partial<FlowSelectionContextInput> = {}): FlowSelectionContextInput {
  return {
    hasTaskType: false,
    isOnboarding: false,
    isMicro: false,
    hasTopic: true,
    sessionsTotal: 5,
    silenceDays: 0,
    pendingChecks: 0,
    openLoops: 0,
    cohortFlags: {},
    ...overrides,
  };
}

// ============================================================================
// FlowTemplate — static factories
// ============================================================================

describe('FlowTemplate', () => {
  it('declaredStandard: p1(silent) → p2(silent) → session(UI)', () => {
    const t = FlowTemplate.declaredStandard();
    expect(t.id).toBe('declared-standard');
    expect(t.phases).toEqual([
      { gate: 'p1', showUI: false },
      { gate: 'p2', showUI: false },
      { gate: 'session', showUI: true },
    ]);
  });

  it('negotiatedStandard: p1(UI) only', () => {
    const t = FlowTemplate.negotiatedStandard();
    expect(t.id).toBe('negotiated-standard');
    expect(t.phases).toEqual([
      { gate: 'p1', showUI: true },
    ]);
  });

  it('onboarding: p1(silent) → p2(silent) → session(UI)', () => {
    const t = FlowTemplate.onboarding();
    expect(t.id).toBe('onboarding');
    expect(t.phases).toEqual([
      { gate: 'p1', showUI: false },
      { gate: 'p2', showUI: false },
      { gate: 'session', showUI: true },
    ]);
  });

  it('micro: p2(UI) → session(UI)', () => {
    const t = FlowTemplate.micro();
    expect(t.id).toBe('micro');
    expect(t.phases).toEqual([
      { gate: 'p2', showUI: true },
      { gate: 'session', showUI: true },
    ]);
  });

  it('is frozen (immutable)', () => {
    const t = FlowTemplate.declaredStandard();
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.phases)).toBe(true);
  });
});

// ============================================================================
// FlowSelectionContext — create() validation
// ============================================================================

describe('FlowSelectionContext.create()', () => {
  it('creates with valid input', () => {
    const ctx = FlowSelectionContext.create(validInput());
    expect(ctx.hasTaskType).toBe(false);
    expect(ctx.sessionsTotal).toBe(5);
  });

  it('is frozen (immutable)', () => {
    const ctx = FlowSelectionContext.create(validInput());
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  // ── Mutual exclusion ──

  it('throws when isOnboarding and isMicro are both true', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ isOnboarding: true, isMicro: true, hasTopic: true })),
    ).toThrow('mutually exclusive');
  });

  // ── hasTopic implication ──

  it('throws when isOnboarding without hasTopic', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ isOnboarding: true, hasTopic: false })),
    ).toThrow('requires hasTopic');
  });

  it('throws when isMicro without hasTopic', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ isMicro: true, hasTopic: false })),
    ).toThrow('requires hasTopic');
  });

  it('throws when hasTaskType without hasTopic', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: false })),
    ).toThrow('requires hasTopic');
  });

  // ── Non-negative validation ──

  it('throws for negative sessionsTotal', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ sessionsTotal: -1 })),
    ).toThrow('sessionsTotal');
  });

  it('throws for fractional sessionsTotal', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ sessionsTotal: 2.5 })),
    ).toThrow('sessionsTotal');
  });

  it('throws for negative silenceDays', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ silenceDays: -1 })),
    ).toThrow('silenceDays');
  });

  it('throws for negative pendingChecks', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ pendingChecks: -3 })),
    ).toThrow('pendingChecks');
  });

  it('throws for negative openLoops', () => {
    expect(() =>
      FlowSelectionContext.create(validInput({ openLoops: -1 })),
    ).toThrow('openLoops');
  });

  // ── Valid edge cases ──

  it('allows zero for all projection signals', () => {
    const ctx = FlowSelectionContext.create(validInput({
      sessionsTotal: 0,
      silenceDays: 0,
      pendingChecks: 0,
      openLoops: 0,
    }));
    expect(ctx.sessionsTotal).toBe(0);
  });

  it('allows hasTopic: false when no flow type flags set', () => {
    const ctx = FlowSelectionContext.create(validInput({ hasTopic: false }));
    expect(ctx.hasTopic).toBe(false);
  });
});

// ============================================================================
// FlowStrategy.select() — lock-down tests (ADR-005 §C7)
// ============================================================================

describe('FlowStrategy.select()', () => {
  it('isOnboarding → onboarding template (priority 1)', () => {
    const ctx = FlowSelectionContext.create(validInput({ isOnboarding: true, hasTopic: true }));
    const template = FlowStrategy.select(ctx);
    expect(template.id).toBe('onboarding');
  });

  it('isMicro → micro template (priority 2)', () => {
    const ctx = FlowSelectionContext.create(validInput({ isMicro: true, hasTopic: true }));
    const template = FlowStrategy.select(ctx);
    expect(template.id).toBe('micro');
  });

  it('hasTaskType → declared-standard template (priority 3)', () => {
    const ctx = FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: true }));
    const template = FlowStrategy.select(ctx);
    expect(template.id).toBe('declared-standard');
  });

  it('default → negotiated-standard template (priority 4)', () => {
    const ctx = FlowSelectionContext.create(validInput({ hasTopic: true }));
    const template = FlowStrategy.select(ctx);
    expect(template.id).toBe('negotiated-standard');
  });

  // ── Forward-compatibility tests (ADR-005 §C7) ──
  // Projection signals don't affect current templates — proves VO carries
  // the right signals without coupling to specific template logic.

  it('changing silenceDays does not affect declared-standard', () => {
    const ctx0 = FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: true, silenceDays: 0 }));
    const ctx10 = FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: true, silenceDays: 10 }));
    expect(FlowStrategy.select(ctx0).id).toBe(FlowStrategy.select(ctx10).id);
  });

  it('changing pendingChecks does not affect negotiated-standard', () => {
    const ctx0 = FlowSelectionContext.create(validInput({ pendingChecks: 0 }));
    const ctx5 = FlowSelectionContext.create(validInput({ pendingChecks: 5 }));
    expect(FlowStrategy.select(ctx0).id).toBe(FlowStrategy.select(ctx5).id);
  });

  it('changing cohortFlags does not affect micro', () => {
    const ctx1 = FlowSelectionContext.create(validInput({ isMicro: true, hasTopic: true, cohortFlags: {} }));
    const ctx2 = FlowSelectionContext.create(validInput({ isMicro: true, hasTopic: true, cohortFlags: { beta: true } }));
    expect(FlowStrategy.select(ctx1).id).toBe(FlowStrategy.select(ctx2).id);
  });

  it('changing sessionsTotal does not affect onboarding', () => {
    const ctx0 = FlowSelectionContext.create(validInput({ isOnboarding: true, hasTopic: true, sessionsTotal: 0 }));
    const ctx100 = FlowSelectionContext.create(validInput({ isOnboarding: true, hasTopic: true, sessionsTotal: 100 }));
    expect(FlowStrategy.select(ctx0).id).toBe(FlowStrategy.select(ctx100).id);
  });

  it('changing openLoops does not affect declared-standard', () => {
    const ctx0 = FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: true, openLoops: 0 }));
    const ctx8 = FlowSelectionContext.create(validInput({ hasTaskType: true, hasTopic: true, openLoops: 8 }));
    expect(FlowStrategy.select(ctx0).id).toBe(FlowStrategy.select(ctx8).id);
  });
});
