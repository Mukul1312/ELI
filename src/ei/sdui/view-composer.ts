/**
 * ViewComposer — pure presenter (StudySessionOrchestration gateway context).
 *
 * Transforms protocol domain outputs + PresentationContext into an SDUI component tree.
 * Stateless. No DB access. No side effects.
 *
 * @see docs/strategic-design/canvas-ei-runtime.md — "Gateway context: maps protocol outputs to UI steps"
 * @see docs/strategic-design/02-subdomains.md §6 — StudySessionOrchestration boundaries
 */

import type {
  NegotiatedIntentIssuedOutput,
  ActivationPlanIssuedOutput,
  VerificationDecisionIssuedOutput,
  Mode,
} from '../schemas/outputs';
import type { SduiResponse } from './types/sdui-contract';
import type { SduiComponent } from './types/components';
import type { PresentationContext } from './presentation-context';
import { resolveMicrocopy, type MicrocopyKey } from './microcopy/resolver';
import { microcopyCatalog, type MicrocopySlot } from './microcopy/catalog';

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
          payload: { topic, mode: output.mode },
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
}

export function composeSessionView(input: SessionViewInput): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

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

/**
 * Compose the checkin phase view (before P1 runs).
 * This is the initial screen the student sees when opening the app.
 */
export function composeCheckinView(ctx: PresentationContext): SduiResponse {
  const header: SduiComponent[] = [];
  const body: SduiComponent[] = [];
  const actions: SduiComponent[] = [];
  const footer: SduiComponent[] = [];

  header.push({
    type: 'message',
    props: { text: 'Check in', variant: 'heading' },
  });
  header.push({
    type: 'message',
    props: { text: "Let's set up your study session", variant: 'subheading' },
  });

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

  return {
    schemaVersion: 1,
    phase: 'checkin',
    view: { header, body, actions, footer },
    domain: null,
    actions: {
      submit_checkin: {
        id: 'submit_checkin',
        endpoint: { method: 'POST', path: '/api/ei/command' },
        payload: {
          commandType: 'AppOpen',
          payload: {
            topic: '{{topic}}',
            energy: '{{energy}}',
            sleepBucket: '{{sleepBucket}}',
            pressure: '{{pressure}}',
            backlogPressure: '{{backlogPressure}}',
          },
        },
      },
    },
  };
}
