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
import type { SduiResponse, SduiAction } from './types/sdui-contract';
import type { SduiActivationCard, SduiComponent } from './types/components';
import type { PresentationContext } from './presentation-context';
import { resolveMicrocopy, type MicrocopyKey } from './microcopy/resolver';
import { microcopyCatalog, type MicrocopySlot } from './microcopy/catalog';
import { getTopicDisplayName } from './topic-display-name';
import type { IdentityEligibilityResult } from './identity/compute-identity-eligibility';
import { detectIdentityPattern } from './identity/compute-identity-eligibility';
import { IDENTITY_STATEMENTS } from './microcopy/identity';

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

const BACKLOG_CHIPS = [
  { label: 'On track', value: 1 },
  { label: 'Mostly on track', value: 2 },
  { label: 'Some pending', value: 3 },
  { label: 'Behind', value: 4 },
  { label: 'Drowning', value: 5 },
] as const;

const PRESSURE_CHIPS = [
  { label: 'Calm', value: 1 },
  { label: 'Slightly tense', value: 2 },
  { label: 'Uneasy', value: 3 },
  { label: 'Very stressed', value: 4 },
  { label: 'Panicky', value: 5 },
] as const;

const TASK_TYPE_CHIPS = [
  { label: 'Learn', value: 'Learn' },
  { label: 'Practice', value: 'Practice' },
  { label: 'Revise', value: 'Revise' },
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

function p2Copy(
  slot: MicrocopySlot,
  mode: Mode,
  playId: string,
  vars: Record<string, string | number> = {},
): string {
  return resolveMicrocopy(microcopyCatalog, { gate: 'P2', slot, mode, playId }, vars);
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
      topic: output.topic,
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

  // Task type scale
  body.push({ type: 'spacer', props: { size: 'md' } });
  body.push({
    type: 'scale-input',
    props: {
      inputId: 'taskType',
      label: 'What kind of work?',
      chips: [...TASK_TYPE_CHIPS],
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
            taskType: '{{taskType}}',
            setAt: new Date().toISOString(),
          },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P2 View Composer (activation)
// ────────────────────────────────────────────────────────────────────────────

// Play ID → activation card variant
const P2_PLAY_VARIANT: Record<string, SduiActivationCard['props']['variant']> = {
  'P2-N1': 'neutral',
  'P2-R1': 'rescue_micro',
  'P2-R2': 'rescue_two_min',
  'P2-R3': 'rescue_watch',
  'P2-B1': 'boost_isolation',
  'P2-B2': 'boost_hard_first',
  'P2-B3': 'boost_continue_last',
};

// Primary CTA label per play variant
const P2_CTA_LABEL: Record<string, string> = {
  neutral: 'Got it. Starting.',
  rescue_micro: "I've opened it",
  rescue_two_min: "I've started",
  rescue_watch: 'Starting now',
  boost_isolation: 'Starting now',
  boost_hard_first: 'On it',
  boost_continue_last: 'Continuing',
  retrieval: "I've done it",
};

// Rationale line per rescue variant (14px, tertiary)
const P2_RATIONALE: Partial<Record<string, string>> = {
  rescue_micro: 'Motion creates momentum.',
  rescue_watch: 'Low start. Full proof at the end.',
};

export function composeP2View(
  output: ActivationPlanIssuedOutput,
  topic: string,
  _replanCount = 0,
  taskType?: string,
  difficultyTier?: string,
): SduiResponse {
  const isRetrieval = taskType === 'Retrieval';
  const variant: SduiActivationCard['props']['variant'] = isRetrieval
    ? 'retrieval'
    : (P2_PLAY_VARIANT[output.playId] ?? 'neutral');

  const firstAction = output.firstAction.description
    ?? p2Copy('activation_description', output.mode, output.playId);

  const rationale = P2_RATIONALE[variant];

  const ctaLabel = P2_CTA_LABEL[variant] ?? 'Got it. Starting.';
  const primaryCtaActionId = isRetrieval ? 'retrieval_done' : 'session_start';

  // For rescue_two_min: include "Done for today" as secondaryCta (shown after 2-min transform)
  const secondaryCta = variant === 'rescue_two_min'
    ? { label: 'Done for today', actionId: 'session_end_early' }
    : undefined;

  // Focus reminder for boost isolation / hard-first (from focusContract)
  const focusReminder = output.focusContract?.noSwitchingUntil
    ? p2Copy('focus_note', output.mode, output.playId)
    : undefined;

  const header: SduiComponent[] = [{
    type: 'session-context-bar',
    props: {
      topic,
      taskType: taskType ?? 'Practice',
      difficultyTier: difficultyTier ?? 'Medium',
    },
  }];

  const body: SduiComponent[] = [{
    type: 'activation-card',
    props: {
      variant,
      firstAction,
      rationale,
      primaryCta: { label: ctaLabel, actionId: primaryCtaActionId },
      secondaryCta,
      focusReminder,
    },
  }];

  const actionsMap: Record<string, SduiAction> = {};

  if (isRetrieval) {
    // Retrieval: "I've done it" → fires FirstActionStarted + SessionEnd → Phase 3 directly
    actionsMap['retrieval_done'] = {
      id: 'retrieval_done',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'SessionEnd',
        payload: { topic, mode: output.mode, endedAt: '{{__nowIso}}', isRetrieval: true },
      },
    };
  } else {
    actionsMap['session_start'] = {
      id: 'session_start',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'SessionStart',
        payload: {
          topic,
          mode: output.mode,
          ...(taskType && { taskType }),
          ...(difficultyTier && { difficultyTier }),
        },
      },
    };
    // rescue_two_min "Done for today" after 2-min transform
    if (variant === 'rescue_two_min') {
      actionsMap['session_end_early'] = {
        id: 'session_end_early',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'SessionEnd',
          payload: { topic, mode: output.mode, endedAt: '{{__nowIso}}' },
        },
      };
    }
  }

  return {
    schemaVersion: 1,
    phase: 'activation',
    view: { header, body, actions: [], footer: [] },
    domain: { ...output, topic },
    actions: actionsMap,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Session View Composer
// ────────────────────────────────────────────────────────────────────────────

export interface SessionViewInput {
  topic: string;
  mode: 'Rescue' | 'Neutral' | 'Boost';
  playId: string;
  /** Task type selected by student during P1 (e.g. 'Learn', 'Practice', 'Revise'). */
  taskType?: string;
  /** Difficulty tier selected during P1 (e.g. 'Easy (1)', 'Hard (3)'). */
  difficultyTier?: string;
}

// Nudge copy per mode (absent for Boost — no nudge in flow state)
const SESSION_NUDGE: Partial<Record<'Rescue' | 'Neutral' | 'Boost', string>> = {
  Neutral: 'Still in it? Good.',
  Rescue: 'Still here. No rush.',
};

export function composeSessionView(input: SessionViewInput): SduiResponse {
  // Context bar: topic info left, elapsed time right (computed from sessionStartedAt)
  const header: SduiComponent[] = [{
    type: 'session-context-bar',
    props: {
      topic: input.topic,
      taskType: input.taskType ?? 'Practice',
      difficultyTier: input.difficultyTier ?? 'Medium',
      sessionStartedAt: new Date().toISOString(),
    },
  }];

  // Body: intentionally empty middle + "End session" text link
  const body: SduiComponent[] = [{
    type: 'session-timer',
    props: {
      endActionId: 'session_end',
      endLabel: 'End session',
      mode: input.mode,
      nudgeCopy: SESSION_NUDGE[input.mode],
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
          payload: { topic: input.topic, endedAt: '{{__nowIso}}' },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 View Composer (verification)
// ────────────────────────────────────────────────────────────────────────────

// Opening line and topic prompt by session mode
const VERIFY_OPENING: Record<'standard' | 'short' | 'long' | 'rescue', string> = {
  standard: 'Quick check so this session counts.',
  short: 'Short session — that still counts.',
  long: 'Strong session. One thing to make it stick.',
  rescue: 'Good session.',
};
const VERIFY_PROMPT: Record<'standard' | 'short' | 'long' | 'rescue', string> = {
  standard: 'Do 1 question. In your head or on paper.',
  short: '1 quick question. In your head.',
  long: 'Do 1 question. In your head or on paper.',
  rescue: '1 question when you\'re ready.',
};

export function composeP3View(
  output: VerificationDecisionIssuedOutput,
  sessionDurationSec?: number,
): SduiResponse {
  let verifyMode: 'standard' | 'short' | 'long' | 'rescue';
  if (output.mode === 'Rescue') {
    verifyMode = 'rescue';
  } else if (sessionDurationSec !== undefined && sessionDurationSec < 600) {
    verifyMode = 'short';
  } else if (sessionDurationSec !== undefined && sessionDurationSec > 2700) {
    verifyMode = 'long';
  } else {
    verifyMode = 'standard';
  }

  const body: SduiComponent[] = [{
    type: 'verification-card',
    props: {
      topic: output.topic,
      mode: verifyMode,
      openingLine: VERIFY_OPENING[verifyMode],
      topicPrompt: VERIFY_PROMPT[verifyMode],
      canDefer: true,
      gotItActionId: 'verification_got_it',
      shakyActionId: 'verification_shaky',
      needsReviewActionId: 'verification_needs_review',
      deferActionId: 'verification_defer',
      skipTimeActionId: 'skip_time',
      skipFatigueActionId: 'skip_fatigue',
      skipConfusionActionId: 'skip_confusion',
    },
  }];

  const tp = { topic: output.topic, mode: output.mode };

  return {
    schemaVersion: 1,
    phase: 'verification',
    view: { header: [], body, actions: [], footer: [] },
    domain: output,
    actions: {
      verification_got_it: {
        id: 'verification_got_it',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'VerificationComplete', payload: { ...tp, result: 'confident', completedAt: '{{__nowIso}}' } },
      },
      verification_shaky: {
        id: 'verification_shaky',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'VerificationComplete', payload: { ...tp, result: 'partial', completedAt: '{{__nowIso}}' } },
      },
      verification_needs_review: {
        id: 'verification_needs_review',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: { commandType: 'VerificationComplete', payload: { ...tp, result: 'needs_review', completedAt: '{{__nowIso}}' } },
      },
      verification_defer: {
        id: 'verification_defer',
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
// Phase 3 Close — scenario-driven done screen
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the Phase 3 close screen with scenario-specific copy and counter animation.
 *
 * Called by verification-complete, retrieval-schedule, and retrieval-skip workflows
 * after the terminal event is appended.
 *
 * @param topic - the topic that was just studied/verified
 * @param mode  - current session mode (Rescue/Neutral/Boost)
 * @param scenario - one of 7 scenarios determined by the calling workflow
 * @param ctx   - PresentationContext with real aggregates (pre-event snapshot)
 */
export function composePhase3View(
  topic: string,
  mode: Mode,
  scenario: Phase3Scenario,
  ctx: PresentationContext,
): SduiResponse {
  const body: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  // ── Exact copy per scenario (from 03-phase3-scenarios.md) ──────────────────
  const TITLE: Record<Phase3Scenario, string> = {
    verified:       '✓  Loop closed.',
    reminded:       'Good session.',
    skip_time:      'Noted. Short day.',
    skip_fatigue:   'Noted. Rest is part of the plan.',
    skip_confusion: "That's okay.\nDifferent approach next time.",
    milestone:      '✓  All clear.',
    first_ever:     '✓  First loop closed.',
  };

  const closesLoop =
    scenario === 'verified' || scenario === 'milestone' || scenario === 'first_ever';
  const countBefore = ctx.pendingChecks;
  const countAfter = closesLoop ? Math.max(0, ctx.pendingChecks - 1) : ctx.pendingChecks;

  // Subline (below headline, 16px secondary)
  let subline: string | undefined;
  if (scenario === 'verified') {
    subline = `${topic} — you proved you remember it.`;
  } else if (scenario === 'milestone') {
    subline = "Everything you've studied —\nyou've also proved.";
  } else if (scenario === 'first_ever') {
    subline = 'That\'s what "closing the loop" means —\nyou studied it AND proved you remember it.';
  }

  // Quoted reflection (16px, in quotes)
  const quote =
    scenario === 'verified' ? '"One less thing on your mind."' :
    scenario === 'milestone' ? '"That\'s rare. Keep that."' :
    undefined;

  // Seed copy per spec
  let seed: string | undefined;
  if (scenario === 'verified' && countAfter >= 1) {
    if (countAfter === 1) seed = '1 check left this week. Almost done.';
    else if (countAfter === 2) seed = '2 checks left this week — you\'re ahead.';
    else if (countAfter === 3) seed = '3 checks left. Steady progress.';
    else seed = `${countAfter} checks remaining. One at a time.`;
  } else if (scenario === 'reminded') {
    seed = 'See you tomorrow.';
  }
  // skip_*, milestone, first_ever: no seed

  // "Clear one more" CTA: verified + energy >= 4 + pending remaining + not needs_review
  const showClearMore = scenario === 'verified' && ctx.energy >= 4 && countAfter >= 1;

  // Primary CTA label
  const primaryCtaLabel = scenario === 'verified' ? 'Done for today' : 'Done';

  body.push({
    type: 'loop-closed-card',
    props: {
      scenario,
      title: TITLE[scenario],
      subline,
      quote,
      countBefore: closesLoop ? countBefore : undefined,
      countAfter: closesLoop ? countAfter : undefined,
      seed,
      primaryCta: { label: primaryCtaLabel, actionId: 'new_session' },
      clearMoreCta: showClearMore
        ? { label: 'Clear one more', actionId: 'clear_more' }
        : undefined,
      milestone: scenario === 'milestone',
      firstEver: scenario === 'first_ever',
    },
  });

  // Footer with updated pending count + optional identity statement
  const p3Pattern = detectIdentityPattern(ctx);
  const p3IdentityStatement =
    ctx.sessionsLast7d >= 3 && ctx.verificationRate7d >= 0.5
      ? IDENTITY_STATEMENTS[p3Pattern].statement
      : undefined;
  footer.push(buildSessionSummaryFooter(ctx, {
    pendingOverride: countAfter,
    identityStatement: p3IdentityStatement,
  }));

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
        payload: { topic, energy: ctx.energy, pressure: ctx.pressure, initial: false },
      },
    };
  }

  return {
    schemaVersion: 1,
    phase: 'done',
    view: { header: [], body, actions: [], footer },
    domain: { topic, mode, scenario },
    actions: actionsMap,
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

const VARIANT_TO_PLAY: Record<Phase1Variant, string> = {
  ONBOARDING: 'P1-ONBOARD',
  SILENCE_RE_ENTRY: 'P1-SILENCE',
  LOW_ENERGY: 'P1-LOW-ENERGY',
  HIGH_PRESSURE: 'P1-PRESSURE',
  CHALLENGE: 'P1-BOOST',
  CLEAR_THEN_CHALLENGE: 'P1-CLEAR-CHALLENGE',
  CLEAN_START: 'P1-RESCUE',
  DEAL_CARD: 'P1-DEAL',
  PENDING_STANDARD: 'P1-PENDING',
};

/** Phase 1 variant precedence: Onboarding > Silence > Low-energy Rescue > High-pressure Rescue > Boost variants > Neutral deal/pending > default. */
export function selectPhase1Variant(ctx: PresentationContext): Phase1Variant {
  if (!ctx.hasPriorOpen) return 'ONBOARDING';
  if (ctx.silenceDays >= 3) return 'SILENCE_RE_ENTRY';
  if (ctx.energy <= 2) return 'LOW_ENERGY';
  if (ctx.mode === 'Rescue' && ctx.pressure >= 4) return 'HIGH_PRESSURE';
  if (ctx.mode === 'Boost' && ctx.pendingChecks >= 1) return 'CLEAR_THEN_CHALLENGE';
  if (ctx.mode === 'Boost') return 'CHALLENGE';
  if (ctx.pendingChecks >= 3 && ctx.closeOpenLoopFirst) return 'DEAL_CARD';
  if (ctx.pendingChecks > 0) return 'PENDING_STANDARD';
  return 'CLEAN_START';
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
    greeting = ctx.pressure >= 5
      ? resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_greeting_p5', mode: ctx.mode, playId }, {})
      : resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_greeting_p4', mode: ctx.mode, playId }, {});
    subGreeting = ctx.pressure >= 5
      ? resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_body_p5', mode: ctx.mode, playId }, {})
      : resolveMicrocopy(microcopyCatalog, { gate: 'P1', slot: 'phase1_high_pressure_body_p4', mode: ctx.mode, playId }, {});
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
          commandType: 'IntentSet',
          payload: {
            topic: t.topicId,
            taskType: 'Revise',
            setAt: new Date().toISOString(),
          },
        },
      };
      const topicName = getTopicDisplayName(t.topicId);
      return { topicId: t.topicId, topicName, daysAgo, actionId };
    });

    if (items.length > 0) {
      const overflowCount = Math.max(0, pendingTopics.length - items.length);
      components.push({
        type: 'pending-items-list',
        props: {
          items,
          overflowLabel: overflowCount > 0 ? `and ${overflowCount} more` : undefined,
        },
      });
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
  | 'verified'     // A: loop closed (VerifyNow, pending > 0 after)
  | 'milestone'    // F: pendingChecks hits 0
  | 'first_ever'   // G: first loop ever closed
  | 'reminded'     // B: ScheduleVerify
  | 'skip_time'    // C: Skip (time)
  | 'skip_fatigue' // D: Skip (fatigue)
  | 'skip_confusion'; // E: Skip (confusion)

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
): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];
  const pendingActions: Record<string, SduiAction> = {};

  header.push({
    type: 'message',
    props: { text: 'Check in', variant: 'heading' },
  });
  header.push({
    type: 'message',
    props: { text: "Let's set up your study session", variant: 'subheading' },
  });

  // ── Greeting section + form ──────────────────────────────────────────────

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
    body.push({
      type: 'identity-moment-card',
      props: {
        statement: identityEligibility.statement.statement,
        detail: identityEligibility.statement.detail,
        ctaLabel: "Let's keep going",
        ctaActionId: 'submit_checkin',
      },
    });
    body.push({ type: 'divider', props: {} });
  } else {
    const { components, pendingTopicActions, variant } = buildPhase1OpenComponents(ctx);
    phase1Variant = variant;
    // V2 LOW_ENERGY: energy scale first, then greeting (client reveals greeting after energy selected)
    if (variant === 'LOW_ENERGY') {
      body.push(energyScaleComponent);
      body.push({ type: 'spacer', props: { size: 'sm' } });
    }
    body.push(...components);
    if (components.length > 0) {
      body.push({ type: 'divider', props: {} });
    }
    Object.assign(pendingActions, pendingTopicActions);
  }

  // ── Form elements ─────────────────────────────────────────────────────────

  // Topic input
  body.push({
    type: 'text-input',
    props: {
      inputId: 'topic',
      label: 'What are you studying?',
      placeholder: 'e.g. Thermodynamics, Organic Chemistry...',
      required: true,
    },
  });
  body.push({ type: 'spacer', props: { size: 'md' } });

  // Energy scale (skip if already added for LOW_ENERGY)
  if (phase1Variant !== 'LOW_ENERGY') {
    body.push(energyScaleComponent);
  }

  // Sleep scale (conditional: first of day, skip for V1 silence)
  if (ctx.isFirstOfDay && phase1Variant !== 'SILENCE_RE_ENTRY') {
    body.push({ type: 'spacer', props: { size: 'sm' } });
    body.push({
      type: 'scale-input',
      props: {
        inputId: 'sleepBucket',
        label: p1Copy('checkin_sleep_label', ctx),
        chips: [...SLEEP_CHIPS],
        required: true,
      },
    });

    // BacklogPressure scale (conditional: first of day, skip for V1 silence)
    body.push({ type: 'spacer', props: { size: 'sm' } });
    body.push({
      type: 'scale-input',
      props: {
        inputId: 'backlogPressure',
        label: p1Copy('checkin_backlog_label', ctx),
        chips: [...BACKLOG_CHIPS],
        required: true,
      },
    });
  }

  // Pressure scale (collapsible "More context", skip for V1 silence)
  if (phase1Variant !== 'SILENCE_RE_ENTRY') {
    body.push({ type: 'spacer', props: { size: 'sm' } });
    body.push({
      type: 'scale-input',
      props: {
        inputId: 'pressure',
        label: p1Copy('checkin_pressure_label', ctx),
        chips: [...PRESSURE_CHIPS],
        required: false,
        collapsible: {
          toggleLabel: p1Copy('checkin_pressure_toggle', ctx),
          defaultOpen: false,
        },
      },
    });
  }

  // Submit
  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        { label: 'Start Session', actionId: 'submit_checkin', variant: 'primary' },
      ],
    },
  });

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
      energy: '{{energy}}',
      sleepBucket: '{{sleepBucket}}',
      pressure: '{{pressure}}',
      backlogPressure: '{{backlogPressure}}',
    },
  };

  const microStartPayload = {
    commandType: 'AppOpen',
    payload: {
      topic: '{{topic}}',
      energy: '{{energy}}',
      sleepBucket: '{{sleepBucket}}',
      pressure: '{{pressure}}',
      backlogPressure: '{{backlogPressure}}',
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
): SduiResponse {
  const topicDisplay = getTopicDisplayName(topic);
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
