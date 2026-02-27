import { describe, it, expect } from 'vitest';
import { composeP1View, composeCheckinView, selectPhase1Variant, composeOnboardingWelcomeView, composeOnboardingTopicTaskView, composeOnboardingResponseView } from '../view-composer';
import { SduiResponseSchema } from '../types/sdui-contract';
import { AppOpenMicroPayloadSchema } from '../../application/ei-protocol-router/command-schema';
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
    hadSilenceInLast14d: false,
    hadHighPressureInLast14d: false,
    hasPriorOpen: true,
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

// ────────────────────────────────────────────────────────────────────────────
// selectPhase1Variant — precedence
// ────────────────────────────────────────────────────────────────────────────

describe('selectPhase1Variant', () => {
  it('returns ONBOARDING when hasPriorOpen is false (even if sessionsLast7d > 0)', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, hasPriorOpen: false }))).toBe('ONBOARDING');
  });

  it('returns SILENCE_RE_ENTRY when silenceDays >= 3 (overrides other Rescue)', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, silenceDays: 4, energy: 1, mode: 'Rescue', hasPriorOpen: true }))).toBe('SILENCE_RE_ENTRY');
  });

  it('returns LOW_ENERGY when energy <= 2 and silence < 3', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, silenceDays: 0, energy: 1, mode: 'Rescue' }))).toBe('LOW_ENERGY');
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, silenceDays: 1, energy: 2, mode: 'Rescue' }))).toBe('LOW_ENERGY');
  });

  it('returns HIGH_PRESSURE when Rescue + pressure >= 4', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, energy: 4, pressure: 4, mode: 'Rescue' }))).toBe('HIGH_PRESSURE');
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, energy: 3, pressure: 5, mode: 'Rescue' }))).toBe('HIGH_PRESSURE');
  });

  it('returns CLEAR_THEN_CHALLENGE when Boost + pendingChecks >= 1', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, mode: 'Boost', pendingChecks: 1 }))).toBe('CLEAR_THEN_CHALLENGE');
  });

  it('returns CHALLENGE when Boost + pendingChecks is 0', () => {
    expect(selectPhase1Variant(baseCtx({ sessionsLast7d: 5, mode: 'Boost', pendingChecks: 0 }))).toBe('CHALLENGE');
  });

  it('returns DEAL_CARD when pendingChecks >= 3 and closeOpenLoopFirst', () => {
    expect(selectPhase1Variant(baseCtx({ mode: 'Neutral', pendingChecks: 3, closeOpenLoopFirst: true }))).toBe('DEAL_CARD');
  });

  it('returns PENDING_STANDARD when pendingChecks > 0 and not deal', () => {
    expect(selectPhase1Variant(baseCtx({ mode: 'Neutral', pendingChecks: 2 }))).toBe('PENDING_STANDARD');
  });

  it('returns CLEAN_START when no override matches', () => {
    expect(selectPhase1Variant(baseCtx({ mode: 'Neutral', pendingChecks: 0 }))).toBe('CLEAN_START');
  });
});

describe('composeCheckinView variant behavior', () => {
  it('LOW_ENERGY: energy scale appears before resume-context-card', () => {
    const result = composeCheckinView(baseCtx({ energy: 1, sessionsLast7d: 5, silenceDays: 0 }));
    const body = result.view.body;
    const energyIdx = body.findIndex((c: any) => c.type === 'scale-input' && c.props?.inputId === 'energy');
    const cardIdx = body.findIndex((c: any) => c.type === 'resume-context-card');
    expect(energyIdx).toBeGreaterThanOrEqual(0);
    expect(cardIdx).toBeGreaterThanOrEqual(0);
    expect(energyIdx).toBeLessThan(cardIdx);
  });

  it('LOW_ENERGY: resume-context-card has showGreetingAfterEnergySelected', () => {
    const result = composeCheckinView(baseCtx({ energy: 1, sessionsLast7d: 5, silenceDays: 0 }));
    const card = (result.view.body as any[]).find((c: any) => c.type === 'resume-context-card');
    expect(card).toBeDefined();
    expect(card.props.showGreetingAfterEnergySelected).toBe(true);
  });

  it('HIGH_PRESSURE: resume-context-card has makeItSmallerContent and micro_start action', () => {
    const result = composeCheckinView(baseCtx({ energy: 4, pressure: 5, mode: 'Rescue', sessionsLast7d: 5 }));
    const card = (result.view.body as any[]).find((c: any) => c.type === 'resume-context-card');
    expect(card).toBeDefined();
    expect(card.props.variant).toBe('HIGH_PRESSURE');
    expect(card.props.makeItSmallerContent).toBeDefined();
    expect(card.props.makeItSmallerContent.greeting).toContain('1 minute');
    expect(result.actions.micro_start).toBeDefined();
  });

  it('energy scale has showNumber when sessionsLast7d <= 3', () => {
    const result = composeCheckinView(baseCtx({ sessionsLast7d: 2 }));
    const energyScale = (result.view.body as any[]).find((c: any) => c.type === 'scale-input' && c.props?.inputId === 'energy');
    expect(energyScale).toBeDefined();
    expect(energyScale.props.showNumber).toBe(true);
  });

  it('energy scale has showNumber false when sessionsLast7d > 3', () => {
    const result = composeCheckinView(baseCtx({ sessionsLast7d: 8 }));
    const energyScale = (result.view.body as any[]).find((c: any) => c.type === 'scale-input' && c.props?.inputId === 'energy');
    expect(energyScale).toBeDefined();
    expect(energyScale.props.showNumber).toBe(false);
  });

  it('V1 SILENCE_RE_ENTRY: excludes sleep, backlog, and pressure scales', () => {
    const result = composeCheckinView(baseCtx({ silenceDays: 4, isFirstOfDay: true }));
    const scales = findAllComponents(result.view.body, 'scale-input');
    const inputIds = scales.map((s: any) => s.props.inputId);
    expect(inputIds).not.toContain('sleepBucket');
    expect(inputIds).not.toContain('backlogPressure');
    expect(inputIds).not.toContain('pressure');
    expect(inputIds).toContain('energy');
  });

  it('V3 micro_start payload conforms to AppOpen micro schema (timeboxMin: 1)', () => {
    const result = composeCheckinView(baseCtx({ energy: 4, pressure: 5, mode: 'Rescue', sessionsLast7d: 5 }));
    const microAction = result.actions.micro_start;
    expect(microAction).toBeDefined();
    const rawPayload = (microAction.payload as any).payload;
    expect(rawPayload.timeboxMin).toBe(1);
    // Resolve template placeholders to concrete values and validate schema
    const resolved = {
      topic: typeof rawPayload.topic === 'string' && !rawPayload.topic.startsWith('{{') ? rawPayload.topic : 'Thermodynamics',
      energy: typeof rawPayload.energy === 'number' ? rawPayload.energy : 3,
      timeboxMin: 1 as const,
      ...(rawPayload.sleepBucket && !String(rawPayload.sleepBucket).startsWith('{{')
        ? { sleepBucket: rawPayload.sleepBucket as '<6' | '6-7' | '7-8' | '>=8' }
        : {}),
      ...(typeof rawPayload.pressure === 'number' ? { pressure: rawPayload.pressure } : {}),
      ...(typeof rawPayload.backlogPressure === 'number' ? { backlogPressure: rawPayload.backlogPressure } : {}),
    };
    const parsed = AppOpenMicroPayloadSchema.safeParse(resolved);
    if (!parsed.success) {
      throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error.format())}`);
    }
    expect(parsed.data.timeboxMin).toBe(1);
  });

  it('footer has expandable false for SILENCE_RE_ENTRY warm-label', () => {
    const result = composeCheckinView(baseCtx({ silenceDays: 4, sessionsLast7d: 0 }));
    const footer = findComponent(result.view.footer, 'session-summary-footer') as any;
    expect(footer).toBeDefined();
    expect(footer.props.expandable).toBe(false);
    expect(footer.props.warmLabel).toBeDefined();
  });

  it('footer has expandable false for ONBOARDING variant', () => {
    const result = composeOnboardingResponseView('Test', 'Learn');
    const footer = findComponent(result.view.footer, 'session-summary-footer') as any;
    expect(footer).toBeDefined();
    expect(footer.props.expandable).toBe(false);
  });
});

describe('onboarding composers', () => {
  it('composeOnboardingWelcomeView returns onboarding-welcome-card', () => {
    const result = composeOnboardingWelcomeView();
    expect(result.phase).toBe('checkin');
    const card = (result.view.body as any[]).find((c: any) => c.type === 'onboarding-welcome-card');
    expect(card).toBeDefined();
    expect(card.props.title).toBe('ELI');
    expect(card.props.ctaLabel).toBe('Get started');
    expect(result.actions.onboarding_next).toBeDefined();
  });

  it('composeOnboardingTopicTaskView returns onboarding-topic-task-form', () => {
    const result = composeOnboardingTopicTaskView();
    expect(result.phase).toBe('checkin');
    const form = (result.view.body as any[]).find((c: any) => c.type === 'onboarding-topic-task-form');
    expect(form).toBeDefined();
    expect(form.props.topicInputId).toBe('topic');
    expect(form.props.taskTypeInputId).toBe('taskType');
    expect(result.actions.submit_onboarding).toBeDefined();
  });

  it('composeOnboardingResponseView returns ONBOARDING resume-context-card', () => {
    const result = composeOnboardingResponseView('Integration', 'Learn');
    expect(result.phase).toBe('checkin');
    const card = (result.view.body as any[]).find((c: any) => c.type === 'resume-context-card');
    expect(card).toBeDefined();
    expect(card.props.variant).toBe('ONBOARDING');
    expect(card.props.greeting).toBe('Welcome.');
    expect(card.props.subGreeting).toContain("You're working on Integration");
    expect(result.actions.small_start).toBeDefined();
    expect(result.domain).toMatchObject({ topic: 'Integration', taskType: 'Learn' });
  });

  it('V10 secondary CTA maps to alternate task type via small_start_alternate', () => {
    const result = composeOnboardingResponseView('Biology', 'Learn');
    const card = (result.view.body as any[]).find((c: any) => c.type === 'resume-context-card');
    expect(card.props.secondaryCta).toBeDefined();
    expect(card.props.secondaryCta.actionId).toBe('small_start_alternate');
    expect(result.actions.small_start_alternate).toBeDefined();
    const alternatePayload = (result.actions.small_start_alternate.payload as any).payload;
    expect(alternatePayload.topic).toBe('Biology');
    expect(alternatePayload.taskType).not.toBe('Learn');
    expect(['Practice', 'Revise']).toContain(alternatePayload.taskType);
  });
});
