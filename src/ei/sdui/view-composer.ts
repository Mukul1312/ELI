/**
 * ViewComposer — pure presenter (StudySessionOrchestration gateway context).
 *
 * Transforms protocol domain outputs + PresentationContext into an SDUI component tree.
 * Stateless. No DB access. No side effects.
 *
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md — "Gateway context: maps protocol outputs to UI steps"
 * @see docs/engineering-ddd-design/02-subdomains.md §6 — StudySessionOrchestration boundaries
 */

import type {
  NegotiatedIntentIssuedOutput,
  ActivationPlanIssuedOutput,
  VerificationDecisionIssuedOutput,
  Mode,
} from '../schemas/outputs';
import type { SduiResponse, SduiAction, SduiSlotEntry } from './types/sdui-contract';
import type { SduiComponent } from './types/components';
import type { PresentationContext } from './presentation-context';
import { resolveMicrocopy, type MicrocopyKey } from './microcopy/resolver';
import { microcopyCatalog, type MicrocopySlot } from './microcopy/catalog';
import { getTopicDisplayName } from './topic-display-name';
import type { IdentityEligibilityResult } from './identity/compute-identity-eligibility';
import { detectIdentityPattern } from './identity/compute-identity-eligibility';
import { IDENTITY_STATEMENTS } from './microcopy/identity';

// ────────────────────────────────────────────────────────────────────────────
// Progressive disclosure helper — wraps a component with visibility metadata
// ────────────────────────────────────────────────────────────────────────────

function grouped(component: SduiComponent, visibilityGroup: string, initiallyVisible = true, hiddenWhenGroup?: string): SduiSlotEntry {
  return { component, visibilityGroup, initiallyVisible, ...(hiddenWhenGroup ? { hiddenWhenGroup } : {}) };
}

// ────────────────────────────────────────────────────────────────────────────
// Scale definitions (server-provided — replaces client hardcoded arrays)
// ────────────────────────────────────────────────────────────────────────────

const ENERGY_CHIPS = [
  { label: 'Exhausted', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Sharp', value: 5 },
] as const;

const SLEEP_CHIPS = [
  { label: 'Sleep-debt', value: '<6' },
  { label: 'Low sleep', value: '6-7' },
  { label: 'Okay sleep', value: '7-8' },
  { label: 'Fully slept', value: '>=8' },
] as const;

const TASK_TYPE_CHIPS = [
  { label: 'Learn', value: 'Learn' },
  { label: 'Practice', value: 'Practice' },
  { label: 'Revise', value: 'Revise' },
] as const;

const TIMEBOX_CHIPS = [
  { label: '~15 min', value: 15 },
  { label: '~30 min', value: 30 },
  { label: '~45 min', value: 45 },
] as const;

const DIFFICULTY_CHIPS = [
  { label: 'Easy', value: 1 },
  { label: 'Medium', value: 2 },
  { label: 'Hard', value: 3 },
  { label: 'Advanced', value: 4 },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Helpers: resolve microcopy per gate
// ────────────────────────────────────────────────────────────────────────────

function p1Copy(
  slot: MicrocopySlot,
  ctx: PresentationContext,
  vars: Record<string, string | number> = {},
): string {
  const key: MicrocopyKey = {
    gate: 'P1',
    slot,
    mode: ctx.mode,
    playId: ctx.playId,
  };
  return resolveMicrocopy(microcopyCatalog, key, vars);
}


// ────────────────────────────────────────────────────────────────────────────
// P1 View Composer
// ────────────────────────────────────────────────────────────────────────────

export function composeP1View(
  output: NegotiatedIntentIssuedOutput,
  ctx: PresentationContext,
): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  // Title + mode badge rendered by scope-card in body; header left empty to avoid duplication.

  // ── Body ────────────────────────────────────────────────────────────────

  // Welcome-back card (S5 pattern: silenceDays >= 2)
  if (ctx.silenceDays >= 2) {
    body.push({
      type: 'welcome-back-card',
      props: {
        greeting: p1Copy('welcome_back_greeting', ctx),
        suggestion: p1Copy('welcome_back_suggestion', ctx),
        choices: [
          { label: '5-minute win', actionId: 'accept_intent' },
          { label: 'I can do more', actionId: 'edit_intent' },
        ],
      },
    });
    body.push({ type: 'spacer', props: { size: 'md' } });
  }

  // ELI scope message (mode/play-personalized)
  body.push({
    type: 'message',
    props: { text: p1Copy('scope_message', ctx), variant: 'body' },
  });
  body.push({ type: 'spacer', props: { size: 'sm' } });

  // Scope card
  const diffLabel = output.scope.difficultyTier.charAt(0).toUpperCase() + output.scope.difficultyTier.slice(1);
  body.push({
    type: 'scope-card',
    props: {
      title: p1Copy('scope_title', ctx),
      topic: getTopicDisplayName(output.topic, output.topicName),
      scopeSummary: `${output.scope.timeboxMin} min · ${output.scope.questionCount} questions · ${diffLabel}`,
      verificationSummary: `Verification: ${output.verificationPlan.minQuestions} question${output.verificationPlan.minQuestions > 1 ? 's' : ''} min${output.verificationPlan.preferVerifyNow ? ' (verify now preferred)' : ''}`,
      badge: { mode: output.mode, label: output.mode },
    },
  });

  // Deal card (S7 pattern: closeOpenLoopFirst when pendingChecks >= 3)
  if (ctx.closeOpenLoopFirst) {
    body.push({ type: 'spacer', props: { size: 'md' } });
    body.push({
      type: 'deal-card',
      props: {
        message: p1Copy('deal_card_message', ctx, { count: ctx.pendingChecks }),
        pendingCount: ctx.pendingChecks,
        choices: [
          { label: p1Copy('deal_card_choice_clear', ctx), actionId: 'clear_check' },
          { label: p1Copy('deal_card_choice_schedule', ctx), actionId: 'schedule_check' },
        ],
      },
    });
  }

  // Task type scale — hide Learn for known topics, pre-select lastTaskType for 8+ sessions
  const topicState = ctx.topicStates.find((ts) => ts.topicId === ctx.topicId);
  const p1TaskChips = topicState && topicState.effortCountTotal > 0
    ? TASK_TYPE_CHIPS.filter((c) => c.value !== 'Learn')
    : [...TASK_TYPE_CHIPS];

  body.push({ type: 'spacer', props: { size: 'md' } });
  body.push({
    type: 'scale-input',
    props: {
      inputId: 'taskType',
      label: 'What kind of work?',
      chips: [...p1TaskChips],
      required: true,
    },
  });

  // Difficulty tier scale
  body.push({ type: 'spacer', props: { size: 'sm' } });
  body.push({
    type: 'scale-input',
    props: {
      inputId: 'difficultyTier',
      label: 'How hard should this feel today?',
      chips: [...DIFFICULTY_CHIPS],
      required: true,
    },
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        { label: 'Accept', actionId: 'accept_intent', variant: 'primary' },
        { label: 'Edit', actionId: 'edit_intent', variant: 'secondary' },
        { label: 'Reject', actionId: 'reject_intent', variant: 'danger' },
      ],
    },
  });

  // ── Footer ──────────────────────────────────────────────────────────────

  if (ctx.pendingChecks > 0) {
    footer.push({
      type: 'pending-checks',
      props: {
        count: ctx.pendingChecks,
        label: p1Copy('pending_checks_label', ctx, { count: ctx.pendingChecks }),
        celebratory: ctx.pendingChecks === 0,
      },
    });
  }

  // ── Build SduiResponse ──────────────────────────────────────────────────

  const respondedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    phase: 'intent',
    view: { header, body, actions, footer },
    domain: output,
    actions: {
      accept_intent: {
        id: 'accept_intent',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'IntentResponse',
          payload: {
            negotiatedIntentId: output.negotiatedIntentId,
            decision: 'accepted',
            respondedAt,
            topic: output.topic,
            ...(output.topicName && { topicName: output.topicName }),
            taskType: '{{taskType}}',
            difficultyTier: '{{difficultyTier}}',
            setAt: respondedAt,
          },
        },
      },
      edit_intent: {
        id: 'edit_intent',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'IntentResponse',
          payload: {
            negotiatedIntentId: output.negotiatedIntentId,
            decision: 'edited',
            respondedAt,
            topic: output.topic,
            ...(output.topicName && { topicName: output.topicName }),
            taskType: '{{taskType}}',
            difficultyTier: '{{difficultyTier}}',
            setAt: respondedAt,
          },
        },
      },
      reject_intent: {
        id: 'reject_intent',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'IntentResponse',
          payload: {
            negotiatedIntentId: output.negotiatedIntentId,
            decision: 'rejected',
            respondedAt,
          },
        },
      },
      clear_check: {
        id: 'clear_check',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'IntentSet',
          payload: {
            topic: output.topic,
            ...(output.topicName && { topicName: output.topicName }),
            taskType: 'Revise',
            setAt: new Date().toISOString(),
          },
        },
      },
      schedule_check: {
        id: 'schedule_check',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'IntentSet',
          payload: {
            topic: output.topic,
            ...(output.topicName && { topicName: output.topicName }),
            taskType: '{{taskType}}',
            setAt: new Date().toISOString(),
          },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P2 View Composer — single screen (delegates to composeSessionView)
// ────────────────────────────────────────────────────────────────────────────

// First-action instruction text by taskType (Neutral mode only for now)
export const FIRST_ACTION_BY_TASK: Record<string, string> = {
  Learn: 'Focus time. Read your notes or watch the lecture for this topic.',
  Practice: 'Focus time. Solve problems from your coaching material or DPP.',
  Revise: 'Focus time. Go through your notes and flag what\'s fuzzy.',
};
export const FIRST_ACTION_DEFAULT = 'Focus time. Start when ready.';

export function composeP2View(
  output: ActivationPlanIssuedOutput,
  topic: string,
  _replanCount = 0,
  taskType?: string,
  timebox?: number,
  topicName?: string,
): SduiResponse {
  const firstActionText = output.firstAction.description
    ?? (taskType ? FIRST_ACTION_BY_TASK[taskType] : undefined)
    ?? FIRST_ACTION_DEFAULT;

  return composeSessionView({
    topic,
    topicName,
    mode: output.mode as 'Rescue' | 'Neutral' | 'Boost',
    playId: output.playId,
    taskType,
    timebox,
    firstActionText,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Session View Composer
// ────────────────────────────────────────────────────────────────────────────

export interface SessionViewInput {
  topic: string;
  topicName?: string;
  mode: 'Rescue' | 'Neutral' | 'Boost';
  playId: string;
  /** Task type selected by student during P1 (e.g. 'Learn', 'Practice', 'Revise'). */
  taskType?: string;
  /** Student's declared time commitment in minutes (e.g. 45). Shown as ~N min in context bar. */
  timebox?: number;
  /** First-action instruction text — visible for the entire session. */
  firstActionText?: string;
  /** ISO timestamp of when the session actually started. Falls back to now if not provided. */
  sessionStartedAt?: string;
}

export function composeSessionView(input: SessionViewInput): SduiResponse {
  const scopeLabel = input.timebox ? `~${input.timebox} min` : '~30 min';

  // Context bar: topic info left, elapsed time right (computed from sessionStartedAt)
  const header: SduiComponent[] = [{
    type: 'session-context-bar',
    props: {
      topic: getTopicDisplayName(input.topic, input.topicName),
      taskType: input.taskType ?? 'Practice',
      scopeLabel,
      sessionStartedAt: input.sessionStartedAt ?? new Date().toISOString(),
    },
  }];

  // Body: first-action text (visible throughout) + "I'm done" text link
  const body: SduiComponent[] = [{
    type: 'session-timer',
    props: {
      endActionId: 'session_end',
      endLabel: "I'm done",
      mode: input.mode,
      ...(input.firstActionText && { firstActionText: input.firstActionText }),
    },
  }];

  return {
    schemaVersion: 1,
    phase: 'session',
    view: { header, body, actions: [], footer: [] },
    domain: input,
    actions: {
      session_end: {
        id: 'session_end',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'SessionEnd',
          payload: { topic: input.topic, ...(input.topicName && { topicName: input.topicName }), ...(input.taskType && { taskType: input.taskType }), endedAt: '{{__nowIso}}' },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 Duration Header helper
// ────────────────────────────────────────────────────────────────────────────

const TASK_TYPE_SESSION_LABEL: Record<string, string> = {
  reading: 'Learn session complete.',
  practice: 'Practice session complete.',
  revision: 'Revision complete.',
  Learn: 'Learn session complete.',
  Practice: 'Practice session complete.',
  Revise: 'Revision complete.',
  Retrieval: 'Retrieval complete.',
};

function buildDurationHeader(topic: string, topicName?: string, taskType?: string, sessionDurationSec?: number): SduiComponent {
  const durationMin = sessionDurationSec != null ? Math.round(sessionDurationSec / 60) : undefined;
  const topicLine = durationMin != null
    ? `${getTopicDisplayName(topic, topicName)} — ${durationMin}m`
    : getTopicDisplayName(topic, topicName);
  const taskTypeLine = TASK_TYPE_SESSION_LABEL[taskType ?? ''] ?? 'Session complete.';
  return { type: 'duration-header', props: { topicLine, taskTypeLine } };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 View Composer — State 3A (The Ask)
// ────────────────────────────────────────────────────────────────────────────

export function composeP3View(
  output: VerificationDecisionIssuedOutput,
  sessionDurationSec?: number,
  dropoutSignalActive = false,
): SduiResponse {
  // Binary: standard or shrunk (mode-specific variants deferred to v2)
  const verifyMode: 'standard' | 'shrunk' = dropoutSignalActive ? 'shrunk' : 'standard';
  const askLine = verifyMode === 'shrunk'
    ? 'Does it feel solid? Just a tap.'
    : 'Does it feel solid now?';

  const header: SduiComponent[] = [
    buildDurationHeader(output.topic, output.topicName, output.taskType, sessionDurationSec),
  ];

  const body: SduiComponent[] = [{
    type: 'verification-card',
    props: {
      mode: verifyMode,
      askLine,
      solidActionId: 'verification_solid',
      notYetActionId: 'verification_not_yet',
      ...(verifyMode === 'standard' && { dontWantActionId: 'verification_dont_want' }),
      skipTimeActionId: 'skip_time',
      skipFatigueActionId: 'skip_fatigue',
      skipConfusionActionId: 'skip_confusion',
    },
  }];

  const tp = { topic: output.topic, ...(output.topicName && { topicName: output.topicName }), mode: output.mode };

  return {
    schemaVersion: 1,
    phase: 'verification',
    view: { header, body, actions: [], footer: [] },
    domain: output,
    actions: {
      verification_solid: {
        id: 'verification_solid',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'VerificationComplete', payload: { ...tp, result: 'confident', completedAt: '{{__nowIso}}' } },
      },
      verification_not_yet: {
        id: 'verification_not_yet',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'VerificationComplete', payload: { ...tp, result: 'not_confident', completedAt: '{{__nowIso}}' } },
      },
      verification_dont_want: {
        id: 'verification_dont_want',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'RetrievalSchedule', payload: { ...tp, dueInHours: 24, minQuestions: 1 } },
      },
      skip_time: {
        id: 'skip_time',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'RetrievalSkip', payload: { ...tp, reason: 'time' } },
      },
      skip_fatigue: {
        id: 'skip_fatigue',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'RetrievalSkip', payload: { ...tp, reason: 'fatigue' } },
      },
      skip_confusion: {
        id: 'skip_confusion',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'RetrievalSkip', payload: { ...tp, reason: 'confusion' } },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 Close — State 3B (The Resolution)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the Phase 3 outcome screen (3B) with scenario-specific copy and counter animation.
 *
 * Called by verification-complete, retrieval-schedule, and retrieval-skip workflows
 * after the terminal event is appended.
 */
export function composePhase3View(
  topic: string,
  mode: Mode,
  scenario: Phase3Scenario,
  ctx: PresentationContext,
  topicName?: string,
  taskType?: string,
  sessionDurationSec?: number,
): SduiResponse {
  const header: SduiComponent[] = [
    buildDurationHeader(topic, topicName, taskType, sessionDurationSec),
  ];
  const body: SduiComponent[] = [];

  const TITLE: Record<Phase3Scenario, string> = {
    verified:       '✓  Loop closed.',
    reminded:       'Noted. I\'ll ask next time.',
    skip_time:      'Noted. Short day.',
    skip_fatigue:   'Noted. Rest is part of the plan.',
    skip_confusion: "That's okay. Different approach next time.",
    milestone:      '✓  All clear.',
    first_ever:     '✓  First loop closed.',
    not_yet:        '✓  Session logged.\nI\'ll keep it on your list.',
    learn_close:    'Done for today.\nI\'ll suggest this when it\'s time to verify.',
  };

  const closesLoop =
    scenario === 'verified' || scenario === 'milestone' || scenario === 'first_ever';
  const isLearn = scenario === 'learn_close';
  const countBefore = ctx.pendingChecks;
  const countAfter = closesLoop ? Math.max(0, ctx.pendingChecks - 1)
    : isLearn ? ctx.pendingChecks + 1
    : ctx.pendingChecks;

  // Counter direction
  let counterDirection: 'down' | 'up' | 'static' | undefined;
  if (closesLoop) counterDirection = 'down';
  else if (isLearn) counterDirection = 'up';
  else if (scenario === 'reminded') counterDirection = 'static';
  // skip_*, not_yet: no counter at all

  // Subline (below headline, 16px secondary)
  let subline: string | undefined;
  if (scenario === 'milestone') {
    subline = "0 pending checks.\nEverything you've studied —\nyou've also proved.";
  } else if (scenario === 'first_ever') {
    subline = "That's what it means — you\nstudied it AND proved you\nremember it.";
  }

  // Quoted reflection
  const quote = scenario === 'milestone' ? '"That\'s rare. Keep that."' : undefined;

  // Seed text — next pending topic hint (loop-closing scenarios only)
  let seed: string | undefined;
  if (closesLoop && countAfter >= 1 && ctx.nextPendingTopic) {
    seed = `${ctx.nextPendingTopic.topicName} waiting\nsince Day ${ctx.nextPendingTopic.waitingSinceDays}.`;
  }

  // "Clear one more" CTA: loop-closing + energy >= 4 + pending remaining
  const showClearMore = (scenario === 'verified' || scenario === 'first_ever') && ctx.energy >= 4 && countAfter >= 1;

  // Show counter for: loop-closing (down), learn_close (up), reminded (static)
  const showCounter = counterDirection != null;

  body.push({
    type: 'loop-closed-card',
    props: {
      scenario,
      title: TITLE[scenario],
      subline,
      quote,
      countBefore: showCounter ? countBefore : undefined,
      countAfter: showCounter ? countAfter : undefined,
      counterDirection,
      seed,
      primaryCta: { label: 'Done', actionId: 'new_session' },
      clearMoreCta: showClearMore
        ? { label: 'Clear one more', actionId: 'clear_more' }
        : undefined,
      milestone: scenario === 'milestone',
      firstEver: scenario === 'first_ever',
    },
  });

  // No footer in Phase 3 (per brief: "No footer. No brand header. No context bar.")

  const actionsMap: Record<string, SduiAction> = {
    new_session: {
      id: 'new_session',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: { commandType: 'AppOpen', payload: { initial: true } },
    },
  };

  if (showClearMore) {
    actionsMap['clear_more'] = {
      id: 'clear_more',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'AppOpen',
        payload: { topic, ...(topicName && { topicName }), energy: ctx.energy, initial: false },
      },
    };
  }

  return {
    schemaVersion: 1,
    phase: 'done',
    view: { header, body, actions: [], footer: [] },
    domain: { topic, mode, scenario },
    actions: actionsMap,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 Learn Close — direct to 3B (no 3A ask)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the Learn close screen (direct to 3B, no verification ask).
 * Called when taskType === 'reading'. RetrievalScheduled already appended by P3 gate.
 */
export function composeLearnCloseView(
  output: VerificationDecisionIssuedOutput,
): SduiResponse {
  const header: SduiComponent[] = [
    buildDurationHeader(output.topic, output.topicName, output.taskType, output.sessionDurationSec),
  ];

  // For Learn, pending_checks doesn't come from PresentationContext here.
  // We use 0 as countBefore since this is a fresh Learn session opening a new loop.
  // The counter shows the number going UP (0 → 1 or N → N+1).
  const body: SduiComponent[] = [{
    type: 'loop-closed-card',
    props: {
      scenario: 'learn_close' as const,
      title: 'Done for today.\nI\'ll suggest this when it\'s time to verify.',
      counterDirection: 'up' as const,
      primaryCta: { label: 'Done', actionId: 'new_session' },
      milestone: false,
      firstEver: false,
    },
  }];

  return {
    schemaVersion: 1,
    phase: 'done',
    view: { header, body, actions: [], footer: [] },
    domain: { topic: output.topic, mode: output.mode, scenario: 'learn_close' },
    actions: {
      new_session: {
        id: 'new_session',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'AppOpen', payload: { initial: true } },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 Open — contextual greeting helpers
// ────────────────────────────────────────────────────────────────────────────

type Phase1Variant =
  | 'ONBOARDING'
  | 'SILENCE_RE_ENTRY'
  | 'LOW_ENERGY'
  | 'HIGH_PRESSURE'
  | 'CHALLENGE'
  | 'CLEAR_THEN_CHALLENGE'
  | 'CLEAN_START'
  | 'DEAL_CARD'
  | 'PENDING_STANDARD';

function shouldShowRecentTopics(
  variant: Phase1Variant,
  pendingChecks: number,
  recentTopics?: Array<{ id: string; name: string }>,
): boolean {
  if (!recentTopics || recentTopics.length === 0) return false;
  if (variant === 'HIGH_PRESSURE' || variant === 'DEAL_CARD'
    || variant === 'ONBOARDING') return false;
  if ((variant === 'PENDING_STANDARD' || variant === 'CLEAR_THEN_CHALLENGE')
    && pendingChecks >= 3) return false;
  return true;
}

const VARIANT_TO_PLAY: Record<Phase1Variant, string> = {
  ONBOARDING: 'P1-ONBOARD',
  SILENCE_RE_ENTRY: 'P1-SILENCE',
  LOW_ENERGY: 'P1-LOW-ENERGY',
  HIGH_PRESSURE: 'P1-PRESSURE',
  CHALLENGE: 'P1-BOOST',
  CLEAR_THEN_CHALLENGE: 'P1-CLEAR-CHALLENGE',
  CLEAN_START: 'P1-CLEAN',
  DEAL_CARD: 'P1-DEAL',
  PENDING_STANDARD: 'P1-PENDING',
  
};

/** Phase 1 variant precedence: Onboarding > Silence > Low-energy Rescue > High-pressure Rescue > Boost variants > Neutral deal/pending > default. */
export function selectPhase1Variant(ctx: PresentationContext): Phase1Variant {
  if (!ctx.hasPriorOpen) return 'ONBOARDING';
  if (ctx.silenceDays >= 3) return 'SILENCE_RE_ENTRY';
  if (ctx.energy <= 2) return 'LOW_ENERGY';
  if (ctx.mode === 'Rescue' && ctx.highPressureDetected) return 'HIGH_PRESSURE';
  if (ctx.mode === 'Boost' && ctx.pendingChecks >= 1) return 'CLEAR_THEN_CHALLENGE';
  if (ctx.mode === 'Boost') return 'CHALLENGE';
  if (ctx.pendingChecks >= 3 && ctx.closeOpenLoopFirst) return 'DEAL_CARD';
  if (ctx.pendingChecks > 0) return 'PENDING_STANDARD';
  return 'CLEAN_START';
}

/** Variants eligible for Tier 2/3 observations (Session 5+). */
const OBSERVATION_ELIGIBLE_VARIANTS: readonly Phase1Variant[] = [
  'CLEAN_START', 'PENDING_STANDARD', 'DEAL_CARD', 'CHALLENGE', 'CLEAR_THEN_CHALLENGE',
];

/**
 * Build a Tier 2 or Tier 3 observation to append to the greeting.
 * Returns undefined when below threshold or variant is ineligible.
 */
export function buildTierObservation(
  ctx: PresentationContext,
  variant: Phase1Variant,
): string | undefined {
  if (!OBSERVATION_ELIGIBLE_VARIANTS.includes(variant)) return undefined;
  if (ctx.sessionsLast7d < 5) return undefined;

  const suffix = ctx.sessionsLast7d >= 7 ? 't3' : 't2';

  // Priority: energy > closure rate > trend > session count
  if (ctx.energy >= 4) {
    return p1Copy(`obs_energy_${suffix}` as MicrocopySlot, ctx);
  }
  if (ctx.verificationRate7d >= 0.7) {
    return p1Copy(`obs_closure_${suffix}` as MicrocopySlot, ctx);
  }
  if (ctx.stateTrend7d === 'improving') {
    return p1Copy(`obs_trend_${suffix}` as MicrocopySlot, ctx);
  }
  return p1Copy(`obs_count_${suffix}` as MicrocopySlot, ctx, { count: ctx.sessionsLast7d });
}

function buildPhase1OpenComponents(ctx: PresentationContext): {
  components: SduiComponent[];
  pendingTopicActions: Record<string, SduiAction>;
  variant: Phase1Variant;
} {
  const variant = selectPhase1Variant(ctx);
  const playId = VARIANT_TO_PLAY[variant];
  const variantCtx = { ...ctx, playId };

  let greeting: string;
  let subGreeting: string | undefined;
  let secondaryCta: { label: string; actionId: string } | undefined;
  let showGreetingAfterEnergySelected: boolean | undefined;
  let makeItSmallerContent: { greeting: string; subGreeting?: string; primaryCta: { label: string; actionId: string } } | undefined;

  if (variant === 'HIGH_PRESSURE') {
    greeting = resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_greeting_p4', mode: ctx.mode, playId }, {});
    subGreeting = resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_body_p4', mode: ctx.mode, playId }, {});
    secondaryCta = { label: resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_cta_smaller', mode: ctx.mode, playId }, {}), actionId: 'make_it_smaller' };
    makeItSmallerContent = {
      greeting: resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_make_it_smaller_greeting', mode: ctx.mode, playId }, {}),
      primaryCta: { label: resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_make_it_smaller_cta', mode: ctx.mode, playId }, {}), actionId: 'micro_start' },
    };
  } else {
    greeting = p1Copy('phase1_greeting', variantCtx);
    subGreeting = variant === 'LOW_ENERGY'
      ? (ctx.energy <= 1 ? "One tiny thing. That's enough." : "Small tasks, short blocks. Let's go.")
      : p1Copy('phase1_sub_greeting', variantCtx, { count: ctx.pendingChecks });
    secondaryCta =
      variant === 'LOW_ENERGY' && ctx.pendingChecks > 0
        ? { label: 'Just 1 pending check', actionId: 'one_pending_check' }
        : variant === 'CLEAR_THEN_CHALLENGE'
          ? { label: 'Start something new', actionId: 'small_start' }
          : undefined;

    showGreetingAfterEnergySelected = variant === 'LOW_ENERGY' ? true : undefined;

    // Tier 2/3 observation: append to greeting at session 5+
    const observation = buildTierObservation(variantCtx, variant);
    if (observation) {
      greeting = greeting + '\n' + observation;
    }
  }

  const pendingItemsLabel =
    ctx.pendingChecks > 0
      ? p1Copy('phase1_pending_items_label', variantCtx, { count: ctx.pendingChecks })
      : undefined;

  const components: SduiComponent[] = [];
  const pendingTopicActions: Record<string, SduiAction> = {};

  components.push({
    type: 'resume-context-card',
    props: {
      variant,
      greeting,
      subGreeting: subGreeting || undefined,
      pendingItemsLabel,
      secondaryCta,
      showGreetingAfterEnergySelected,
      makeItSmallerContent,
    },
  });

  // Pending items list: only topics that are pending checks (effort done, retrieval not done)
  // Filter matches StudentAggregates pendingChecks definition.
  if (ctx.pendingChecks > 0 && ctx.mode !== 'Rescue' && ctx.topicStates.length > 0) {
    const now = Date.now();
    const pendingTopics = ctx.topicStates.filter(
      (t) => t.lastEffortAt != null && (!t.lastRetrievalAt || t.lastEffortAt > t.lastRetrievalAt),
    );
    const items = pendingTopics.slice(0, 5).map((t) => {
      const refDate = t.lastScheduledDueAt ?? t.lastEffortAt ?? new Date();
      const daysAgo = Math.max(
        0,
        Math.floor((now - refDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const actionId = `intent_topic_${t.topicId}`;
      pendingTopicActions[actionId] = {
        id: actionId,
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'AppOpen',
          payload: {
            topic: t.topicId,
            topicId: t.topicId,
            ...(t.topicName && { topicName: t.topicName }),
            energy: '{{energy}}',
            sleepBucket: '{{sleepBucket}}',
          },
        },
      };
      const displayName = getTopicDisplayName(t.topicId, t.topicName);
      return { topicId: t.topicId, topicName: displayName, daysAgo, actionId };
    });

    if (items.length > 0) {
      // Hero card: first (oldest) pending topic
      const hero = items[0];
      components.push({
        type: 'pending-hero-card' as any,
        props: {
          topicId: hero.topicId,
          topicName: hero.topicName,
          daysAgo: hero.daysAgo,
          actionId: hero.actionId,
          label: items.length > 1 ? 'Continue where you left off' : undefined,
        },
      });

      // Backlog: remaining topics as subtle list
      if (items.length > 1) {
        const backlogItems = items.slice(1);
        const overflowCount = Math.max(0, pendingTopics.length - items.length);
        components.push({
          type: 'pending-items-list',
          props: {
            items: backlogItems,
            overflowLabel: overflowCount > 0 ? `and ${overflowCount} more` : undefined,
          },
        });
      }
    }
  }

  return { components, pendingTopicActions, variant };
}

function buildSessionSummaryFooter(
  ctx: PresentationContext,
  options?: { pendingOverride?: number; identityStatement?: string; variant?: Phase1Variant },
): SduiComponent {
  const trendLabel =
    ctx.stateTrend7d === 'improving' ? '↑' :
    ctx.stateTrend7d === 'worsening' ? '↓' :
    'steady';
  const pending = options?.pendingOverride ?? ctx.pendingChecks;
  const useWarmLabel = ctx.silenceDays >= 3 || options?.variant === 'HIGH_PRESSURE' || options?.variant === 'ONBOARDING';
  const warmLabelText = options?.variant === 'ONBOARDING'
    ? "Your first session starts now."
    : options?.variant === 'HIGH_PRESSURE'
      ? resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_footer_pressure_label', mode: ctx.mode, playId: ctx.playId }, {})
      : p1Copy('phase1_footer_warm_label', ctx);
  const collapsedLabel = useWarmLabel
    ? warmLabelText
    : `This week: ${ctx.sessionsLast7d} sessions · ${ctx.loopsClosedLast7d} loops closed · ${trendLabel}`;
  return {
    type: 'session-summary-footer',
    props: {
      collapsedLabel,
      sessions: ctx.sessionsLast7d,
      loopsClosed: ctx.loopsClosedLast7d,
      pending,
      rate: ctx.verificationRate7d,
      trend: ctx.stateTrend7d,
      identityStatement: options?.identityStatement,
      warmLabel: useWarmLabel ? warmLabelText : undefined,
      expandable: !useWarmLabel,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 Close — scenario types
// ────────────────────────────────────────────────────────────────────────────

export type Phase3Scenario =
  | 'verified'       // A: loop closed (VerifyNow, pending > 0 after)
  | 'milestone'      // F: pendingChecks hits 0
  | 'first_ever'     // G: first loop ever closed
  | 'reminded'       // B: ScheduleVerify / deferral
  | 'skip_time'      // C: Skip (time)
  | 'skip_fatigue'   // D: Skip (fatigue)
  | 'skip_confusion' // E: Skip (confusion)
  | 'not_yet'        // honest "Not yet" — loop stays open
  | 'learn_close';   // Learn → auto-revisit, counter UP

/**
 * Compose the checkin phase view (before P1 runs).
 * This is the initial screen the student sees when opening the app.
 *
 * @param identityEligibility - pre-computed identity check from the Mastra step.
 *   When eligible, renders identity-moment-card in place of the greeting section.
 */
export function composeCheckinView(
  ctx: PresentationContext,
  identityEligibility?: IdentityEligibilityResult,
  recentTopics?: Array<{ id: string; name: string }>,
): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiSlotEntry[] = [];
  const actions: SduiSlotEntry[] = [];
  const footer: SduiComponent[] = [];
  const pendingActions: Record<string, SduiAction> = {};

  // ── Greeting section ─────────────────────────────────────────────────────
  // Progressive disclosure groups:
  //   1A (visible): greeting + energy — initial anchor
  //   1B (hidden):  sleep + topic input + pending items — revealed when energy selected
  //   1C (hidden):  Start button — revealed when topic selected

  let phase1Variant: Phase1Variant = selectPhase1Variant(ctx);
  const showNumber = ctx.sessionsLast7d <= 3;

  const energyScaleComponent: SduiComponent = {
    type: 'scale-input',
    props: {
      inputId: 'energy',
      label: p1Copy('checkin_energy_label', ctx),
      chips: [...ENERGY_CHIPS],
      required: true,
      showNumber,
    },
  };

  if (identityEligibility?.eligible && identityEligibility.statement) {
    // Identity moment — replaces regular greeting; footer hidden
    body.push(grouped({
      type: 'identity-moment-card',
      props: {
        statement: identityEligibility.statement.statement,
        detail: identityEligibility.statement.detail,
        ctaLabel: "Let's keep going",
        ctaActionId: 'submit_checkin',
      },
    }, '1A'));
    body.push(grouped({ type: 'divider', props: {} }, '1A'));
  } else {
    const { components, pendingTopicActions, variant } = buildPhase1OpenComponents(ctx);
    phase1Variant = variant;
    // V2 LOW_ENERGY: energy scale first, then greeting (client reveals greeting after energy selected)
    if (variant === 'LOW_ENERGY') {
      body.push(grouped(energyScaleComponent, '1A', true, '1B'));
      body.push(grouped({ type: 'spacer', props: { size: 'sm' } }, '1A', true, '1B'));
      // Energy breadcrumb (appears in 1B when energy scale collapses)
      body.push(grouped({
        type: 'field-breadcrumb' as any,
        props: {
          inputId: 'energy',
          label: 'Energy',
          valueLabels: { '1': 'Exhausted (1)', '2': 'Low (2)', '3': 'Okay (3)', '4': 'Good (4)', '5': 'Sharp (5)' },
          editActionId: 'edit_energy',
        },
      }, '1B', false));
    }
    // Two-node greeting + hero/backlog grouping
    for (const comp of components) {
      if (comp.type === 'pending-items-list' || comp.type === 'pending-hero-card') {
        body.push(grouped(comp, '1B', false, '1C'));
      } else if (comp.type === 'resume-context-card') {
        if (variant === 'LOW_ENERGY') {
          // LOW_ENERGY: greeting hidden until energy selected (which triggers 1B).
          // User never sees full greeting in 1A, so only emit compact in 1B.
          body.push(grouped(
            { ...comp, props: { ...comp.props, compact: true } } as SduiComponent,
            '1B', false, '1C',
          ));
        } else {
          // Two-node: full in 1A (hides when 1B), compact in 1B (hides when 1C)
          body.push(grouped(comp, '1A', true, '1B'));
          body.push(grouped(
            { ...comp, props: { ...comp.props, compact: true } } as SduiComponent,
            '1B', false, '1C',
          ));
        }
      } else {
        body.push(grouped(comp, '1A', true, '1C'));
      }
    }
    if (components.length > 0 && variant !== 'CLEAN_START') {
      body.push(grouped({ type: 'divider', props: {} }, '1A', true, '1C'));
    }
    Object.assign(pendingActions, pendingTopicActions);
  }

  // ── 1A: Energy (visible from start) ───────────────

  // Energy scale (skip if already added for LOW_ENERGY)
  if (phase1Variant !== 'LOW_ENERGY') {
    body.push(grouped(energyScaleComponent, '1A', true, '1B'));
    // Energy breadcrumb (appears in 1B when energy scale collapses)
    body.push(grouped({
      type: 'field-breadcrumb' as any,
      props: {
        inputId: 'energy',
        label: 'Energy',
        valueLabels: { '1': 'Exhausted (1)', '2': 'Low (2)', '3': 'Okay (3)', '4': 'Good (4)', '5': 'Sharp (5)' },
        editActionId: 'edit_energy',
      },
    }, '1B', false));
  }

  // Sleep scale (revealed with topic after energy selected — part of 1B)
  if (ctx.isFirstOfDay && phase1Variant !== 'SILENCE_RE_ENTRY') {
    body.push(grouped({ type: 'spacer', props: { size: 'sm' } }, '1B', false, '1C'));
    body.push(grouped({
      type: 'scale-input',
      props: {
        inputId: 'sleepBucket',
        label: p1Copy('checkin_sleep_label', ctx),
        chips: [...SLEEP_CHIPS],
        required: true,
      },
    }, '1B', false, '1C'));
  }

  // ── 1B: Topic input (revealed when energy selected) ──────────────────────

  const showRecent = shouldShowRecentTopics(phase1Variant, ctx.pendingChecks, recentTopics);
  body.push(grouped({
    type: 'topic-input',
    props: {
      inputId: 'topic',
      label: 'What are you studying?',
      placeholder: 'e.g. Thermodynamics, Organic Chemistry...',
      required: true,
      recentTopics: showRecent ? (recentTopics ?? []) : [],
      browseEnabled: phase1Variant !== 'HIGH_PRESSURE',
      instituteId: null,
    },
  }, '1B', false, '1C'));
  body.push(grouped({ type: 'spacer', props: { size: 'md' } }, '1B', false, '1C'));

  // ── 1C: Task type + timebox + Start (revealed when topic selected) ──────

  // Topic breadcrumb (appears in 1C)
  body.push(grouped({
    type: 'field-breadcrumb' as any,
    props: {
      inputId: 'topicName',
      label: 'Topic',
      editActionId: 'edit_topic',
    },
  }, '1C', false));

  // ── Topic-aware task type overrides ──────────────────────────────────────
  // Learn chip hidden for known topics (effortCountTotal > 0).
  // Pre-select lastTaskType for topics with 8+ sessions.
  const hiddenChipsByTopic: Record<string, string[]> = {};
  const defaultByTopic: Record<string, string> = {};
  for (const ts of ctx.topicStates) {
    if (ts.effortCountTotal > 0) {
      hiddenChipsByTopic[ts.topicId] = ['Learn'];
    }
    if (ts.effortCountTotal >= 8 && ts.lastTaskType) {
      defaultByTopic[ts.topicId] = ts.lastTaskType;
    }
  }

  body.push(grouped({
    type: 'scale-input',
    props: {
      inputId: 'taskType',
      label: 'What kind of session?',
      chips: [...TASK_TYPE_CHIPS],
      required: true,
      ...(Object.keys(hiddenChipsByTopic).length > 0 && { hiddenChipsByTopic }),
      ...(Object.keys(defaultByTopic).length > 0 && { defaultByTopic }),
      ...((Object.keys(hiddenChipsByTopic).length > 0 || Object.keys(defaultByTopic).length > 0) && { topicSourceField: 'topicId' }),
    },
  }, '1C', false));

  // Formation period: scope picker hidden for Sessions 1-2 (no loop completed yet)
  if (ctx.sessionsTotal >= 3) {
    body.push(grouped({ type: 'spacer', props: { size: 'sm' } }, '1C', false));

    body.push(grouped({
      type: 'scale-input',
      props: { inputId: 'timebox', label: 'How long?', chips: [...TIMEBOX_CHIPS], required: false },
    }, '1C', false));
  }

  body.push(grouped({ type: 'spacer', props: { size: 'md' } }, '1C', false));

  actions.push(grouped({
    type: 'action-group',
    props: {
      layout: 'column',
      buttons: [
        { label: 'Start Session', actionId: 'submit_checkin', variant: 'primary', size: 'large' as const },
      ],
    },
  }, '1C', false));

  // ── Footer: session summary (hidden when identity card is shown) ──────────

  if (!identityEligibility?.eligible) {
    const pattern = detectIdentityPattern(ctx);
    const identityStatement =
      ctx.sessionsLast7d >= 3 && ctx.verificationRate7d >= 0.5
        ? IDENTITY_STATEMENTS[pattern].statement
        : undefined;
    footer.push(buildSessionSummaryFooter(ctx, { identityStatement, variant: phase1Variant }));
  }

  // ── Build response ────────────────────────────────────────────────────────

  const checkinPayload = {
    commandType: 'AppOpen',
    payload: {
      topic: '{{topic}}',
      topicId: '{{topicId}}',
      topicName: '{{topicName}}',
      energy: '{{energy}}',
      sleepBucket: '{{sleepBucket}}',
      taskType: '{{taskType}}',
      timebox: '{{timebox}}',
    },
  };

  const microStartPayload = {
    commandType: 'AppOpen',
    payload: {
      topic: '{{topic}}',
      topicId: '{{topicId}}',
      topicName: '{{topicName}}',
      energy: '{{energy}}',
      sleepBucket: '{{sleepBucket}}',
      timeboxMin: 1,
    },
  };

  const actionsMap: Record<string, SduiAction> = {
    submit_checkin: {
      id: 'submit_checkin',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: checkinPayload,
    },
    small_start: {
      id: 'small_start',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: checkinPayload,
    },
    one_pending_check: {
      id: 'one_pending_check',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: checkinPayload,
    },
    ...pendingActions,
  };

  // V3 HIGH_PRESSURE: make_it_smaller is client-only (transforms card); micro_start fires IntentSet with timeboxMin=1
  if (phase1Variant === 'HIGH_PRESSURE') {
    actionsMap['micro_start'] = {
      id: 'micro_start',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: microStartPayload,
    };
  }

  const mode = phase1VariantToMode(phase1Variant);
  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header, body, actions, footer },
    domain: { mode },
    actions: actionsMap,
  };
}

/** Map Phase1 variant to Mode for page-level styling (background, top padding). */
function phase1VariantToMode(v: Phase1Variant): Mode {
  if (v === 'SILENCE_RE_ENTRY' || v === 'LOW_ENERGY' || v === 'HIGH_PRESSURE') return 'Rescue';
  if (v === 'CHALLENGE' || v === 'CLEAR_THEN_CHALLENGE') return 'Boost';
  return 'Neutral'; // CLEAN_START, PENDING_STANDARD, DEAL_CARD, IDENTITY_MOMENT, ONBOARDING
}

// ────────────────────────────────────────────────────────────────────────────
// Onboarding flow — Screen 1 (Welcome) and Screen 2 (Topic + Task type)
// ────────────────────────────────────────────────────────────────────────────

const ONBOARDING_WELCOME_COPY = {
  title: 'ELI',
  tagline: 'Your study companion.',
  bodyLines: ['No schedules. No tracking.', 'Just 3 moments — open, study, close the loop.'],
  momentsHighlight: 'open, study, close the loop',
  ctaLabel: 'Get started',
  ctaActionId: 'onboarding_next',
} as const;

const ONBOARDING_TOPIC_TASK_COPY = {
  topicLabel: "What topic are you working on today?",
  topicPlaceholder: 'e.g. Integration, Cell Division, Electrostatics',
  subjectChips: [
    { value: 'P', label: 'P' },
    { value: 'C', label: 'C' },
    { value: 'M', label: 'M' },
    { value: 'B', label: 'B' },
  ],
  taskTypeLabel: "What kind of work?",
  taskTypeChips: [
    { label: 'Learn', value: 'Learn' },
    { label: 'Practice', value: 'Practice' },
    { label: 'Revise', value: 'Revise' },
  ],
  submitCtaLabel: "Let's go",
  submitActionId: 'submit_onboarding',
} as const;

/** Compose onboarding Screen 1 — Welcome. Client advances to Screen 2 on CTA tap. */
export function composeOnboardingWelcomeView(): SduiResponse {
  const body: SduiComponent[] = [
    {
      type: 'onboarding-welcome-card',
      props: {
        ...ONBOARDING_WELCOME_COPY,
        bodyLines: [...ONBOARDING_WELCOME_COPY.bodyLines],
      },
    },
  ];
  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header: [], body, actions: [], footer: [] },
    domain: { mode: 'Neutral' as Mode, onboardingStep: 1 },
    actions: {
      onboarding_next: {
        id: 'onboarding_next',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'OnboardingAdvance', payload: { step: 2 } },
      },
    },
  };
}

/** Compose onboarding Screen 3 (ELI's first response) — after topic+taskType submitted. */
export function composeOnboardingResponseView(
  topic: string,
  taskType: string,
  topicName?: string,
): SduiResponse {
  const topicDisplay = getTopicDisplayName(topic, topicName);
  const primaryLabel = `Start ${taskType.toLowerCase()} (15–20 min)`;
  const alternates = ['Learn', 'Practice', 'Revise'].filter((t) => t !== taskType);
  const alternateTaskType = alternates[0];
  const secondaryCta = alternateTaskType
    ? { label: `Start ${alternateTaskType.toLowerCase()}`, actionId: 'small_start_alternate' as const }
    : undefined;

  const body: SduiComponent[] = [
    {
      type: 'resume-context-card',
      props: {
        variant: 'ONBOARDING',
        greeting: 'Welcome.',
        subGreeting: `ELI helps you study smarter — not longer.\n\nYou're working on ${topicDisplay}.`,
        primaryCta: { label: primaryLabel, actionId: 'small_start' },
        secondaryCta,
      },
    },
  ];

  const minCtx = {
    mode: 'Neutral' as Mode,
    playId: 'P1-ONBOARD',
    silenceDays: 0,
    pendingChecks: 0,
    sessionsLast7d: 0,
    loopsClosedLast7d: 0,
    verificationRate7d: 0,
    stateTrend7d: 'flat' as const,
  } as PresentationContext;
  const footer: SduiComponent[] = [
    buildSessionSummaryFooter(minCtx, { variant: 'ONBOARDING' as Phase1Variant }),
  ];

  const actions: Record<string, SduiAction> = {
    small_start: {
      id: 'small_start',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'IntentSet',
        payload: { topic, taskType, setAt: new Date().toISOString() },
      },
    },
  };
  if (alternateTaskType) {
    actions['small_start_alternate'] = {
      id: 'small_start_alternate',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'IntentSet',
        payload: { topic, taskType: alternateTaskType, setAt: new Date().toISOString() },
      },
    };
  }

  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header: [], body, actions: [], footer },
    domain: { mode: 'Neutral' as Mode, topic, taskType },
    actions,
  };
}

/** Compose onboarding Screen 2 — Topic + Task type. Client POSTs AppOpen on submit. */
export function composeOnboardingTopicTaskView(): SduiResponse {
  const body: SduiComponent[] = [
    {
      type: 'onboarding-topic-task-form',
      props: {
        topicInputId: 'topic',
        topicLabel: ONBOARDING_TOPIC_TASK_COPY.topicLabel,
        topicPlaceholder: ONBOARDING_TOPIC_TASK_COPY.topicPlaceholder,
        subjectChips: [...ONBOARDING_TOPIC_TASK_COPY.subjectChips],
        taskTypeInputId: 'taskType',
        taskTypeLabel: ONBOARDING_TOPIC_TASK_COPY.taskTypeLabel,
        taskTypeChips: [...ONBOARDING_TOPIC_TASK_COPY.taskTypeChips],
        submitCtaLabel: ONBOARDING_TOPIC_TASK_COPY.submitCtaLabel,
        submitActionId: ONBOARDING_TOPIC_TASK_COPY.submitActionId,
      },
    },
  ];
  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header: [], body, actions: [], footer: [] },
    domain: { mode: 'Neutral' as Mode, onboardingStep: 2 },
    actions: {
      submit_onboarding: {
        id: 'submit_onboarding',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'AppOpen',
          payload: {
            topic: '{{topic}}',
            taskType: '{{taskType}}',
            subject: '{{subject}}',
          },
        },
      },
    },
  };
}
