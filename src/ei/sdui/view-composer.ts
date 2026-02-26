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
import type { SduiComponent } from './types/components';
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

function p3Copy(
  slot: MicrocopySlot,
  mode: Mode,
  playId: string,
  vars: Record<string, string | number> = {},
): string {
  return resolveMicrocopy(microcopyCatalog, { gate: 'P3', slot, mode, playId }, vars);
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

  header.push({
    type: 'message',
    props: { text: p1Copy('scope_title', ctx), variant: 'heading' },
  });
  header.push({
    type: 'mode-badge',
    props: { mode: output.mode, label: output.mode },
  });

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

export function composeP2View(
  output: ActivationPlanIssuedOutput,
  topic: string,
  replanCount = 0,
  taskType?: string,
  difficultyTier?: string,
): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  const activationTitle = p2Copy('activation_title', output.mode, output.playId);

  header.push({
    type: 'message',
    props: { text: activationTitle, variant: 'heading' },
  });
  header.push({
    type: 'mode-badge',
    props: { mode: output.mode, label: output.mode },
  });

  const desc = output.firstAction.description
    ?? p2Copy('activation_description', output.mode, output.playId);
  const timeboxParts: string[] = [];
  if (output.firstAction.timeboxMin) timeboxParts.push(`${output.firstAction.timeboxMin} min`);
  if (output.firstAction.timeboxSec) timeboxParts.push(`${output.firstAction.timeboxSec} sec`);
  const timebox = timeboxParts.length > 0 ? timeboxParts.join(' / ') : undefined;

  const focusNote = output.focusContract?.noSwitchingUntil
    ? p2Copy('focus_note', output.mode, output.playId)
    : undefined;

  body.push({
    type: 'activation-card',
    props: {
      title: activationTitle,
      description: desc,
      timebox,
      focusNote,
      badge: { mode: output.mode, label: output.mode },
    },
  });

  const replanDisabled =
    output.replanCap != null && replanCount >= output.replanCap;
  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        { label: 'Start', actionId: 'session_start', variant: 'primary' },
        {
          label: `Replan (${replanCount}${output.replanCap != null ? `/${output.replanCap}` : ''})`,
          actionId: 'replan',
          variant: 'secondary',
          disabled: replanDisabled,
          disabledReason: replanDisabled ? 'Replan limit reached' : undefined,
        },
      ],
    },
  });

  return {
    schemaVersion: 1,
    phase: 'activation',
    view: { header, body, actions, footer },
    domain: { ...output, topic },
    actions: {
      session_start: {
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
      },
      replan: {
        id: 'replan',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'Replan',
          payload: { topic, mode: output.mode },
        },
      },
    },
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

export function composeSessionView(input: SessionViewInput): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  // Session context bar (WS5) — subtle one-line topic/difficulty reminder
  header.push({
    type: 'session-context-bar',
    props: {
      topic: input.topic,
      taskType: input.taskType ?? 'Practice',
      difficultyTier: input.difficultyTier ?? 'Medium',
    },
  });

  header.push({
    type: 'message',
    props: { text: `Studying: ${input.topic}`, variant: 'heading' },
  });

  body.push({
    type: 'session-timer',
    props: {
      topic: input.topic,
      showTimer: true,
      endActionId: 'session_end',
      endLabel: 'End Session',
    },
  });

  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        {
          label: 'End Session',
          actionId: 'session_end',
          variant: 'danger',
        },
      ],
    },
  });

  return {
    schemaVersion: 1,
    phase: 'session',
    view: { header, body, actions, footer },
    domain: input,
    actions: {
      session_end: {
        id: 'session_end',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'SessionEnd',
          payload: {
            topic: input.topic,
            endedAt: '{{__nowIso}}',
          },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// P3 View Composer (verification)
// ────────────────────────────────────────────────────────────────────────────

export function composeP3View(output: VerificationDecisionIssuedOutput): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  const verificationTitle = p3Copy('verification_title', output.mode, output.playId);

  header.push({
    type: 'message',
    props: { text: verificationTitle, variant: 'heading' },
  });
  header.push({
    type: 'mode-badge',
    props: { mode: output.mode, label: output.mode },
  });

  const minQ = output.verificationSpec?.minQuestions ?? 1;
  const primarySection: Array<{ text: string; variant?: 'body' | 'muted' | 'emphasis' }> = [];
  const fallbackSection:
    | { label: string; items: Array<{ text: string; variant?: 'body' | 'muted' | 'emphasis' }> }
    | undefined = undefined;

  if (output.verificationDecision === 'VerifyNow') {
    const verifyPrompt = p3Copy('verify_now_prompt', output.mode, output.playId, { count: minQ });
    primarySection.push({ text: verifyPrompt, variant: 'muted' });
    body.push({
      type: 'verification-card',
      props: {
        title: verificationTitle,
        prompt: verifyPrompt,
        badge: { mode: output.mode, label: output.mode },
        primarySection,
        fallbackSection,
      },
    });
    body.push({
      type: 'numeric-input',
      props: {
        inputId: 'questionsAttempted',
        label: 'Questions attempted',
        min: 0,
        required: true,
      },
    });
    body.push({
      type: 'numeric-input',
      props: {
        inputId: 'correct',
        label: 'Correct',
        min: 0,
        required: true,
      },
    });
    actions.push({
      type: 'action-group',
      props: {
        layout: 'row',
        buttons: [
          {
            label: 'Submit Verification',
            actionId: 'verification_complete',
            variant: 'primary',
          },
        ],
      },
    });
  } else if (output.verificationDecision === 'ScheduleVerify' && output.deadlineSpec) {
    const { dueInHours, minQuestions } = output.deadlineSpec;
    const schedulePrompt = p3Copy('schedule_prompt', output.mode, output.playId, { hours: dueInHours });
    primarySection.push({ text: schedulePrompt, variant: 'muted' });
    body.push({
      type: 'verification-card',
      props: {
        title: verificationTitle,
        prompt: p3Copy('schedule_prompt', output.mode, output.playId, { hours: dueInHours }),
        badge: { mode: output.mode, label: output.mode },
        primarySection,
        fallbackSection,
      },
    });
    actions.push({
      type: 'action-group',
      props: {
        layout: 'row',
        buttons: [
          {
            label: `Schedule (${dueInHours}h)`,
            actionId: 'retrieval_schedule',
            variant: 'primary',
          },
        ],
      },
    });
  } else if (output.verificationDecision === 'Skip') {
    const skipPrompt = p3Copy('skip_prompt', output.mode, output.playId);
    primarySection.push({ text: skipPrompt, variant: 'muted' });
    body.push({
      type: 'verification-card',
      props: {
        title: verificationTitle,
        prompt: skipPrompt,
        badge: { mode: output.mode, label: output.mode },
        primarySection,
        fallbackSection,
      },
    });
    actions.push({
      type: 'action-group',
      props: {
        layout: 'column',
        buttons: [
          { label: 'Skip (Fatigue)', actionId: 'retrieval_skip_fatigue', variant: 'secondary' },
          { label: 'Skip (Time)', actionId: 'retrieval_skip_time', variant: 'secondary' },
          { label: 'Skip (Confusion)', actionId: 'retrieval_skip_confusion', variant: 'secondary' },
        ],
      },
    });
  }

  // Fallback "Verify now instead" for ScheduleVerify/Skip
  if (output.verificationDecision !== 'VerifyNow') {
    body.push({ type: 'spacer', props: { size: 'md' } });
    body.push({
      type: 'message',
      props: { text: 'Or verify now instead:', variant: 'muted' },
    });
    body.push({
      type: 'numeric-input',
      props: { inputId: 'questionsAttempted', label: 'Questions', min: 0, required: false },
    });
    body.push({
      type: 'numeric-input',
      props: { inputId: 'correct', label: 'Correct', min: 0, required: false },
    });
    actions.push({
      type: 'action-group',
      props: {
        layout: 'row',
        buttons: [
          {
            label: 'Verify Now',
            actionId: 'verification_complete',
            variant: 'secondary',
          },
        ],
      },
    });
  }

  const actionMap: Record<string, { id: string; endpoint: { method: 'POST'; path: string }; payload: Record<string, unknown> }> = {
    verification_complete: {
      id: 'verification_complete',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'VerificationComplete',
        payload: {
          topic: output.topic,
          mode: output.mode,
          questionsAttempted: '{{questionsAttempted}}',
          correct: '{{correct}}',
          completedAt: '{{__nowIso}}',
        },
      },
    },
    retrieval_schedule: {
      id: 'retrieval_schedule',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: {
        commandType: 'RetrievalSchedule',
        payload: {
          topic: output.topic,
          mode: output.mode,
          dueInHours: output.deadlineSpec?.dueInHours ?? 24,
          minQuestions: output.deadlineSpec?.minQuestions ?? 1,
        },
      },
    },
    retrieval_skip_fatigue: {
      id: 'retrieval_skip_fatigue',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: { commandType: 'RetrievalSkip', payload: { topic: output.topic, mode: output.mode, reason: 'fatigue' } },
    },
    retrieval_skip_time: {
      id: 'retrieval_skip_time',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: { commandType: 'RetrievalSkip', payload: { topic: output.topic, mode: output.mode, reason: 'time' } },
    },
    retrieval_skip_confusion: {
      id: 'retrieval_skip_confusion',
      endpoint: { method: 'POST', path: '/api/ei/command' },
      payload: { commandType: 'RetrievalSkip', payload: { topic: output.topic, mode: output.mode, reason: 'confusion' } },
    },
  };

  return {
    schemaVersion: 1,
    phase: 'verification',
    view: { header, body, actions, footer },
    domain: output,
    actions: actionMap,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Done View Composer
// ────────────────────────────────────────────────────────────────────────────

export interface DoneViewInput {
  topic: string;
  mode: 'Rescue' | 'Neutral' | 'Boost';
  durationSec?: number;
}

export function composeDoneView(input: DoneViewInput): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  const summaryLines: string[] = [
    `Mode today: ${input.mode}`,
    `Topic: ${input.topic}`,
  ];
  if (input.durationSec != null && input.durationSec > 0) {
    const m = Math.floor(input.durationSec / 60);
    const s = input.durationSec % 60;
    summaryLines.push(`Duration: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }

  body.push({
    type: 'done-card',
    props: {
      title: 'Session Complete',
      topic: input.topic,
      badge: { mode: input.mode, label: input.mode },
      summary: summaryLines,
      celebrationMessage: 'Great work.',
    },
  });

  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        { label: 'Start New Session', actionId: 'new_session', variant: 'primary' },
      ],
    },
  });

  return {
    schemaVersion: 1,
    phase: 'done',
    view: { header, body, actions, footer },
    domain: input,
    actions: {
      new_session: {
        id: 'new_session',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'AppOpen',
          payload: { initial: true },
        },
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 Close — scenario-driven done screen (replaces generic composeDoneView)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the Phase 3 close screen with scenario-specific copy and counter animation.
 *
 * Called by verification-complete, retrieval-schedule, and retrieval-skip workflows
 * after the terminal event is appended. Replaces composeDoneView for those workflows.
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
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  const title = p3Copy(PHASE3_SLOT[scenario], mode, 'P3-N1');
  const message = p3Copy(PHASE3_MESSAGE_SLOT[scenario], mode, 'P3-N1');

  // Counter: scenarios A/F/G close a loop (pending decreases by 1)
  const closesLoop =
    scenario === 'verified' || scenario === 'milestone' || scenario === 'first_ever';
  const countBefore = ctx.pendingChecks;
  const countAfter = closesLoop ? Math.max(0, ctx.pendingChecks - 1) : ctx.pendingChecks;

  // Seed per spec: verified=count-based, reminded=time-based, skip=none, milestone=identity, first_ever=none
  let seed: string | undefined;
  if (scenario === 'verified' && countAfter >= 1) {
    seed = `${countAfter} check${countAfter !== 1 ? 's' : ''} left this week — you're ahead.`;
  } else if (scenario === 'reminded') {
    seed = 'See you tomorrow.';
  } else if (scenario === 'milestone') {
    seed = "Everything you've studied, you've also proved.";
  }
  // skip_* and first_ever: no seed

  // "Clear one more" CTA: only when verified + energy >= 4 + still has pending
  const showClearMore = scenario === 'verified' && ctx.energy >= 4 && countAfter >= 1;

  body.push({
    type: 'loop-closed-card',
    props: {
      scenario,
      title,
      topicName: topic,
      message,
      countBefore: closesLoop ? countBefore : undefined,
      countAfter: closesLoop ? countAfter : undefined,
      seed,
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

  actions.push({
    type: 'action-group',
    props: {
      layout: 'row',
      buttons: [
        { label: 'Start New Session', actionId: 'new_session', variant: 'primary' },
      ],
    },
  });

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
    view: { header, body, actions, footer },
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
  | 'HIGH_PRESSURE'
  | 'CHALLENGE'
  | 'CLEAN_START'
  | 'DEAL_CARD'
  | 'PENDING_STANDARD';

const VARIANT_TO_PLAY: Record<Phase1Variant, string> = {
  ONBOARDING: 'P1-ONBOARD',
  SILENCE_RE_ENTRY: 'P1-SILENCE',
  HIGH_PRESSURE: 'P1-PRESSURE',
  CHALLENGE: 'P1-BOOST',
  CLEAN_START: 'P1-RESCUE',
  DEAL_CARD: 'P1-DEAL',
  PENDING_STANDARD: 'P1-PENDING',
};

function selectPhase1Variant(ctx: PresentationContext): Phase1Variant {
  if (ctx.sessionsLast7d === 0) return 'ONBOARDING';
  if (ctx.silenceDays >= 3) return 'SILENCE_RE_ENTRY';
  if (ctx.mode === 'Rescue' && ctx.pressure >= 4) return 'HIGH_PRESSURE';
  if (ctx.mode === 'Rescue') return 'CLEAN_START';
  if (ctx.pendingChecks >= 3 && ctx.closeOpenLoopFirst) return 'DEAL_CARD';
  if (ctx.pendingChecks > 0) return 'PENDING_STANDARD';
  if (ctx.mode === 'Boost') return 'CHALLENGE';
  return 'CLEAN_START';
}

const PHASE3_MESSAGE_SLOT: Record<Phase3Scenario, MicrocopySlot> = {
  verified: 'phase3_done_verified',
  milestone: 'phase3_done_milestone',
  first_ever: 'phase3_done_first_ever',
  reminded: 'phase3_done_reminded',
  skip_time: 'phase3_done_skip_time',
  skip_fatigue: 'phase3_done_skip_fatigue',
  skip_confusion: 'phase3_done_skip_confusion',
};

function buildPhase1OpenComponents(ctx: PresentationContext): {
  components: SduiComponent[];
  pendingTopicActions: Record<string, SduiAction>;
} {
  const variant = selectPhase1Variant(ctx);
  const playId = VARIANT_TO_PLAY[variant];
  const variantCtx = { ...ctx, playId };
  const greeting = p1Copy('phase1_greeting', variantCtx);
  const subGreeting = p1Copy('phase1_sub_greeting', variantCtx);
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
      primaryCta: { label: p1Copy('phase1_cta', variantCtx), actionId: 'small_start' },
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

  return { components, pendingTopicActions };
}

function buildSessionSummaryFooter(
  ctx: PresentationContext,
  options?: { pendingOverride?: number; identityStatement?: string },
): SduiComponent {
  const trendLabel =
    ctx.stateTrend7d === 'improving' ? '↑' :
    ctx.stateTrend7d === 'worsening' ? '↓' :
    'steady';
  const pending = options?.pendingOverride ?? ctx.pendingChecks;
  const warmLabelText = p1Copy('phase1_footer_warm_label', ctx);
  const collapsedLabel =
    ctx.silenceDays >= 3
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
      warmLabel: ctx.silenceDays >= 3 ? warmLabelText : undefined,
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

const PHASE3_SLOT: Record<Phase3Scenario, MicrocopySlot> = {
  verified: 'close_verified',
  reminded: 'close_reminded',
  skip_time: 'close_skip_time',
  skip_fatigue: 'close_skip_fatigue',
  skip_confusion: 'close_skip_confusion',
  milestone: 'close_milestone',
  first_ever: 'close_first_ever',
};

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

  // ── Greeting section ─────────────────────────────────────────────────────

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
    // Normal contextual greeting + optional pending items list
    const { components, pendingTopicActions } = buildPhase1OpenComponents(ctx);
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

  // Energy scale (always shown)
  body.push({
    type: 'scale-input',
    props: {
      inputId: 'energy',
      label: p1Copy('checkin_energy_label', ctx),
      chips: [...ENERGY_CHIPS],
      required: true,
    },
  });

  // Sleep scale (conditional: first of day)
  if (ctx.isFirstOfDay) {
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

    // BacklogPressure scale (conditional: first of day)
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

  // Pressure scale (collapsible "More context")
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
    footer.push(buildSessionSummaryFooter(ctx, { identityStatement }));
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

  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header, body, actions, footer },
    domain: null,
    actions: {
      submit_checkin: {
        id: 'submit_checkin',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: checkinPayload,
      },
      // small_start: same payload as submit_checkin (greeting CTA)
      small_start: {
        id: 'small_start',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: checkinPayload,
      },
      ...pendingActions,
    },
  };
}
