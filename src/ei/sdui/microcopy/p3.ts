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
};
