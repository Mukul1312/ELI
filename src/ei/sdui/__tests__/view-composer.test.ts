import { describe, it, expect } from 'vitest';
import { composeP1View, composeCheckinView } from '../view-composer';
import { SduiResponseSchema } from '../types/sdui-contract';
import type { NegotiatedIntentIssuedOutput } from '../../schemas/outputs';
import type { PresentationContext } from '../presentation-context';

// ────────────────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────────────────

function baseDomainOutput(
  overrides: Partial<NegotiatedIntentIssuedOutput> = {},
): NegotiatedIntentIssuedOutput {
  return {
    negotiatedIntentId: 'ni-test-123',
    studentId: 'student-1',
    mode: 'Neutral',
    playId: 'P1-N1',
    topic: 'Thermodynamics',
    scope: { timeboxMin: 25, questionCount: 5, difficultyTier: 'med' },
    verificationPlan: { minQuestions: 2, preferVerifyNow: false },
    stateScore: 50,
    issuedAt: '2025-06-01T12:00:00Z',
    ...overrides,
  };
}

function baseCtx(overrides: Partial<PresentationContext> = {}): PresentationContext {
  return {
    studentId: 'student-1',
    topicId: 'Thermodynamics',
    mode: 'Neutral',
    playId: 'P1-N1',
    stateScore: 50,
    pendingChecks: 0,
    silenceDays: 0,
    isFirstOfDay: true,
    tightnessLevel: 'Normal',
    energy: 3,
    pressure: 2,
    closeOpenLoopFirst: false,
    verificationRate7d: 0,
    stateTrend7d: 'flat',
    sessionsLast7d: 5,
    loopsClosedLast7d: 2,
    topicStates: [],
    lastIdentityShownAt: null,
    ...overrides,
  };
}

function findComponent(components: unknown[], type: string) {
  return (components as Array<{ type: string }>).find((c) => c.type === type);
}

function findAllComponents(components: unknown[], type: string) {
  return (components as Array<{ type: string }>).filter((c) => c.type === type);
}

// ────────────────────────────────────────────────────────────────────────────
// composeP1View
// ────────────────────────────────────────────────────────────────────────────

describe('composeP1View', () => {
  it('returns a valid SduiResponse for the intent phase', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    const parsed = SduiResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.schemaVersion).toBe(1);
    expect(result.phase).toBe('intent');
  });

  it('includes header with scope title and mode badge', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    const header = result.view.header;
    expect(findComponent(header, 'message')).toBeDefined();
    expect(findComponent(header, 'mode-badge')).toBeDefined();
  });

  it('includes scope card in body', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    const scopeCard = findComponent(result.view.body, 'scope-card');
    expect(scopeCard).toBeDefined();
  });

  it('includes task type and difficulty scale inputs', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    const scales = findAllComponents(result.view.body, 'scale-input');
    const inputIds = scales.map((s: any) => s.props.inputId);
    expect(inputIds).toContain('taskType');
    expect(inputIds).toContain('difficultyTier');
  });

  it('includes accept/edit/reject action buttons', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    const actionGroup = findComponent(result.view.actions, 'action-group') as any;
    expect(actionGroup).toBeDefined();
    const actionIds = actionGroup.props.buttons.map((b: any) => b.actionId);
    expect(actionIds).toContain('accept_intent');
    expect(actionIds).toContain('edit_intent');
    expect(actionIds).toContain('reject_intent');
  });

  it('includes action definitions for accept/edit/reject', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx());
    expect(result.actions.accept_intent).toBeDefined();
    expect(result.actions.edit_intent).toBeDefined();
    expect(result.actions.reject_intent).toBeDefined();
    expect(result.actions.accept_intent.endpoint.method).toBe('POST');
    expect(result.actions.accept_intent.endpoint.path).toBe('/api/ei/command');
  });

  it('passes domain output through as domain field', () => {
    const output = baseDomainOutput();
    const result = composeP1View(output, baseCtx());
    expect(result.domain).toEqual(output);
  });

  // ── Deal card (S7 pattern: closeOpenLoopFirst) ──────────────────────────

  it('does NOT show deal card when closeOpenLoopFirst is false', () => {
    const result = composeP1View(
      baseDomainOutput(),
      baseCtx({ closeOpenLoopFirst: false, pendingChecks: 0 }),
    );
    const dealCard = findComponent(result.view.body, 'deal-card');
    expect(dealCard).toBeUndefined();
  });

  it('shows deal card when closeOpenLoopFirst is true', () => {
    const result = composeP1View(
      baseDomainOutput(),
      baseCtx({ closeOpenLoopFirst: true, pendingChecks: 3 }),
    );
    const dealCard = findComponent(result.view.body, 'deal-card');
    expect(dealCard).toBeDefined();
    expect((dealCard as any).props.pendingCount).toBe(3);
  });

  it('includes clear_check and schedule_check actions when deal card shown', () => {
    const result = composeP1View(
      baseDomainOutput(),
      baseCtx({ closeOpenLoopFirst: true, pendingChecks: 3 }),
    );
    expect(result.actions.clear_check).toBeDefined();
    expect(result.actions.schedule_check).toBeDefined();
  });

  // ── Welcome-back card (S5 pattern: silenceDays >= 2) ────────────────────

  it('does NOT show welcome-back card when silenceDays < 2', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx({ silenceDays: 1 }));
    const card = findComponent(result.view.body, 'welcome-back-card');
    expect(card).toBeUndefined();
  });

  it('shows welcome-back card when silenceDays >= 2', () => {
    const result = composeP1View(baseDomainOutput(), baseCtx({ silenceDays: 3 }));
    const card = findComponent(result.view.body, 'welcome-back-card');
    expect(card).toBeDefined();
    expect((card as any).props.greeting).toBeTruthy();
    expect((card as any).props.suggestion).toBeTruthy();
  });

  // ── Pending checks footer ──────────────────────────────────────────────

  it('shows pending-checks indicator in footer when pendingChecks > 0', () => {
    const result = composeP1View(
      baseDomainOutput(),
      baseCtx({ pendingChecks: 2 }),
    );
    const indicator = findComponent(result.view.footer, 'pending-checks');
    expect(indicator).toBeDefined();
    expect((indicator as any).props.count).toBe(2);
  });

  it('hides pending-checks indicator when pendingChecks is 0', () => {
    const result = composeP1View(
      baseDomainOutput(),
      baseCtx({ pendingChecks: 0 }),
    );
    const indicator = findComponent(result.view.footer, 'pending-checks');
    expect(indicator).toBeUndefined();
  });

  // ── Mode-specific microcopy ────────────────────────────────────────────

  it('uses Rescue-specific scope message when mode is Rescue', () => {
    const result = composeP1View(
      baseDomainOutput({ mode: 'Rescue', playId: 'P1-R1' }),
      baseCtx({ mode: 'Rescue', playId: 'P1-R1' }),
    );
    const scopeMsg = findAllComponents(result.view.body, 'message')
      .find((c: any) => c.props.variant === 'body');
    // P1-R1 play-specific copy should be "No speeches..."
    expect((scopeMsg as any).props.text).toContain('tiny');
  });

  it('uses Boost-specific scope message when mode is Boost', () => {
    const result = composeP1View(
      baseDomainOutput({ mode: 'Boost', playId: 'P1-B1' }),
      baseCtx({ mode: 'Boost', playId: 'P1-B1' }),
    );
    const scopeMsg = findAllComponents(result.view.body, 'message')
      .find((c: any) => c.props.variant === 'body');
    // P1-B1 play-specific copy should mention "zone" or "difficulty"
    expect((scopeMsg as any).props.text).toContain('difficulty');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// composeCheckinView
// ────────────────────────────────────────────────────────────────────────────

describe('composeCheckinView', () => {
  it('returns a valid SduiResponse for the checkin phase', () => {
    const result = composeCheckinView(baseCtx());
    const parsed = SduiResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.phase).toBe('checkin');
  });

  it('always shows topic text-input and energy scale-input', () => {
    const result = composeCheckinView(baseCtx({ isFirstOfDay: false }));
    const textInput = findComponent(result.view.body, 'text-input') as any;
    expect(textInput).toBeDefined();
    expect(textInput.props.inputId).toBe('topic');

    const scales = findAllComponents(result.view.body, 'scale-input');
    const energyScale = scales.find((s: any) => s.props.inputId === 'energy');
    expect(energyScale).toBeDefined();
  });

  it('shows sleep and backlog scales when isFirstOfDay is true', () => {
    const result = composeCheckinView(baseCtx({ isFirstOfDay: true }));
    const scales = findAllComponents(result.view.body, 'scale-input');
    const inputIds = scales.map((s: any) => s.props.inputId);
    expect(inputIds).toContain('sleepBucket');
    expect(inputIds).toContain('backlogPressure');
  });

  it('hides sleep and backlog scales when isFirstOfDay is false', () => {
    const result = composeCheckinView(baseCtx({ isFirstOfDay: false }));
    const scales = findAllComponents(result.view.body, 'scale-input');
    const inputIds = scales.map((s: any) => s.props.inputId);
    expect(inputIds).not.toContain('sleepBucket');
    expect(inputIds).not.toContain('backlogPressure');
  });

  it('always shows pressure scale as collapsible', () => {
    const result = composeCheckinView(baseCtx());
    const scales = findAllComponents(result.view.body, 'scale-input');
    const pressureScale = scales.find((s: any) => s.props.inputId === 'pressure') as any;
    expect(pressureScale).toBeDefined();
    expect(pressureScale.props.collapsible).toBeDefined();
    expect(pressureScale.props.collapsible.defaultOpen).toBe(false);
  });

  it('includes submit_checkin action', () => {
    const result = composeCheckinView(baseCtx());
    expect(result.actions.submit_checkin).toBeDefined();
    expect(result.actions.submit_checkin.payload).toHaveProperty('commandType', 'AppOpen');
  });
});
