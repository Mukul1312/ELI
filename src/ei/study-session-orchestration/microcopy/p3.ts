/**
 * P3 (Verification) microcopy catalog.
 */

import type { GateCatalog } from './types';

export const P3_CATALOG: GateCatalog = {
  verification_title: {
    default: 'Quick Check',
    byMode: {
      Rescue: 'Tiny proof.',
      Neutral: 'Quick Check',
      Boost: 'Lock it in.',
    },
    byPlay: {
      'R3-01': 'One question. Unlock the session.',
      'R3-02': 'Schedule for later. Rest now.',
      'R3-03': 'Quick concept check.',
      'N3-01': 'Quick Check',
      'N3-02': 'Schedule for 24–48h.',
      'B3-01': 'Verify now. Lock the gain.',
      'B3-02': 'Quality proof.',
      'B3-03': 'Close the loop.',
    },
  },
  verify_now_prompt: {
    default: 'Answer {{count}} question(s) to lock in this session.',
    byMode: {
      Rescue: 'One question. That\'s enough.',
      Neutral: 'Answer {{count}} question(s) to lock in.',
      Boost: 'Lock it in. {{count}} question(s).',
    },
  },
  schedule_prompt: {
    default: 'Schedule for {{hours}}h from now.',
    byMode: {
      Rescue: 'Rest now. Schedule for {{hours}}h.',
      Neutral: 'Schedule for {{hours}}h.',
      Boost: 'Spacing helps. Schedule for {{hours}}h.',
    },
  },
  skip_prompt: {
    default: 'You can skip. Pick a reason.',
    byMode: {
      Rescue: 'Skip if needed. No judgment.',
      Neutral: 'You can skip. Pick a reason.',
      Boost: 'Skip if you must.',
    },
  },
  done_title: {
    default: 'Session Complete',
    byMode: {
      Rescue: 'You showed up. That counts.',
      Neutral: 'Session Complete',
      Boost: 'Strong session.',
    },
  },
  celebration_message: {
    default: 'Great work.',
    byMode: {
      Rescue: 'You started. That\'s the win.',
      Neutral: 'Great work.',
      Boost: 'Well done.',
    },
  },
  // ─── Phase 3 "The Close" — scenario-specific copy (WS7) ────────────────────
  // Scenario A: student completed verification
  close_verified: {
    default: 'Loop closed.',
    byMode: {
      Rescue: 'You proved it. That\'s enough.',
      Neutral: 'Loop closed.',
      Boost: 'Locked. One less pending check.',
    },
  },
  // Scenario B: student scheduled a reminder
  close_reminded: { default: 'Good session. Reminder set.' },
  // Scenario C: student skipped — reason: Time
  close_skip_time: { default: 'Noted. Short day.' },
  // Scenario D: student skipped — reason: Fatigue
  close_skip_fatigue: { default: "Noted. Rest is part of the plan." },
  // Scenario E: student skipped — reason: Confusion
  close_skip_confusion: { default: "That's okay. Different approach next time." },
  // Scenario F: pendingChecks hit 0 after verification
  close_milestone: { default: 'All clear. 0 pending checks.' },
  // Scenario G: first ever loop close
  close_first_ever: { default: 'First loop closed.' },
  // Phase 3 done screen — scenario-specific message (replaces hardcoded PHASE3_MESSAGE)
  phase3_done_verified: { default: 'Good work. You proved it.' },
  phase3_done_milestone: { default: "Everything you've studied, you've also proved." },
  phase3_done_first_ever: {
    default: 'That\'s what "closing the loop" means — you studied it AND proved you remember it.',
  },
  phase3_done_reminded: { default: "You'll see it again soon." },
  phase3_done_skip_time: { default: 'Time ran out — that happens.' },
  phase3_done_skip_fatigue: { default: 'Recovery matters.' },
  phase3_done_skip_confusion: { default: 'Confusion is a signal, not a failure.' },
  // Forward-looking seeds
  seed_verified: { default: "{{count}} checks left this week — you're ahead." },
  seed_reminded: { default: 'See you tomorrow.' },
};
