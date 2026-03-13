/**
 * P2 (Activation) microcopy catalog.
 */

import type { GateCatalog } from './types';

export const P2_CATALOG: GateCatalog = {
  activation_title: {
    default: 'Get Started',
    byMode: {
      Rescue: 'Small start.',
      Neutral: 'Get Started',
      Boost: 'Let\'s go.',
    },
    byPlay: {
      'P2-R1': 'One question. That\'s it.',
      'P2-R2': 'Two minutes. Permission to stop.',
      'P2-R3': 'Watch or read — then verify.',
      'P2-N1': 'Get Started',
      'P2-N2': 'Stay focused. Replan cap active.',
      'P2-B1': 'Deep focus. No switching.',
      'P2-B2': 'Hard first. You\'ve got this.',
      'P2-B3': 'Pick up where you left off.',
    },
  },
  activation_description: {
    default: 'Start your session.',
    byMode: {
      Rescue: 'Start tiny. Build from there.',
      Neutral: 'Start your session.',
      Boost: 'Push the bar. No distractions.',
    },
  },
  focus_note: {
    default: 'Stay on topic.',
    byPlay: {
      'P2-B1': 'No switching for 25 min. Deep focus.',
    },
  },
};
