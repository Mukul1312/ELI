/**
 * P1 (Intent) microcopy catalog.
 * Elder brother tone: calm, brief, evidence-based, non-judgmental.
 */

import type { GateCatalog } from './types';

export const P1_CATALOG: GateCatalog = {
  scope_title: { default: 'Your Plan' },
  scope_message: {
    default: "Here's your plan for today.",
    byMode: {
      Rescue: "Today's energy is low — shorter scope keeps the loop moving.",
      Neutral: "Here's your plan. Minor adjustments to keep things balanced.",
      Boost: "You're fully charged. Let's raise the bar.",
    },
    byPlay: {
      'P1-R3': "Your drive is real. But today's pressure is high. Let's make a plan you can actually start.",
      'P1-R1': 'No speeches. Let\'s keep it tiny. Just one small step today.',
      'P1-R2': "You're active, but proof is lagging. Let's close the oldest check first — tiny verify, then continue.",
      'P1-N2': 'Solid energy today. Let\'s make sure sessions count — quick check at the end.',
      'P1-B1': "You're in the zone. Let's push the difficulty up — not the hours.",
      'P1-B2': 'Good momentum. Let\'s add density — harder problems, same timebox.',
      'P1-B3': "Strong day. Let's spend it on something you've been avoiding.",
    },
  },
  deal_card_message: {
    default: 'You have {{count}} pending checks. Deal: clear the oldest one first, then go big.',
    byMode: {
      Rescue: "You have {{count}} pending checks. Let's close the oldest one — tiny verify, then continue.",
      Neutral: 'You have {{count}} pending checks. Deal: clear 1 first, then go big.',
      Boost: '{{count}} pending checks in the queue. Clear 1 fast, then push harder.',
    },
  },
  deal_card_choice_clear: { default: 'Clear oldest check now' },
  deal_card_choice_schedule: { default: 'Clear one check tomorrow (24h)' },
  checkin_energy_label: { default: "How's your energy right now?" },
  checkin_sleep_label: { default: 'How did you sleep?' },
  checkin_backlog_label: { default: 'How behind do you feel?' },
  checkin_pressure_label: { default: 'How stressed are you feeling?' },
  checkin_pressure_toggle: { default: '+ More context' },
  welcome_back_greeting: {
    default: "Welcome back. Let's keep it tiny today.",
    byPlay: { 'P1-R1': "Welcome back. Today is not a comeback story. It's a 5-minute win." },
  },
  welcome_back_suggestion: { default: 'Pick the smallest thing you can do right now.' },
  pending_checks_label: { default: 'Pending checks: {{count}}' },
  // ─── Phase 1 "The Open" — variant-specific greeting copy ───────────────────
  phase1_greeting: {
    default: 'Good to see you.',
    byPlay: {
      // SILENCE_RE_ENTRY: warm, no reference to time away
      'P1-SILENCE': 'Welcome back.',
      // HIGH_PRESSURE: Rescue mode + high pressure
      'P1-PRESSURE': "Today's a heavy day. Let's keep it small.",
      // CHALLENGE: Boost mode
      'P1-BOOST': "You're in a good rhythm. Time to raise the bar.",
      // CLEAN_START: Rescue mode, default
      'P1-RESCUE': "Let's keep it simple today.",
      // DEAL_CARD: pending >= 3
      'P1-DEAL': 'A few things are waiting. Deal: clear one, then continue.',
      // PENDING_STANDARD: pending > 0, Neutral
      'P1-PENDING': 'A few things to pick up.',
      // ONBOARDING: first session ever
      'P1-ONBOARD': "Good to have you here. Let's start small.",
    },
  },
  phase1_sub_greeting: {
    default: '',
    byPlay: {
      'P1-SILENCE': "Nothing to catch up on. Just where you left off.",
      'P1-PRESSURE': 'One thing. Finish it. That\'s enough.',
      'P1-BOOST': "Same topic, harder problems. Let's see what sticks.",
      'P1-DEAL': 'Clear oldest check first — 5 minutes. Then go big.',
      'P1-PENDING': 'Pick up where you left off.',
      'P1-ONBOARD': 'Pick one topic. Start. The rest will follow.',
    },
  },
  phase1_pending_items_label: {
    default: '{{count}} things waiting to be tested',
    byMode: {
      Neutral: '{{count}} pending checks',
      Boost: '{{count}} checks in the queue',
    },
  },
  phase1_footer_warm_label: { default: "Quiet week. That's okay." },
  phase1_cta: {
    default: 'Start',
    byPlay: {
      'P1-ONBOARD': 'Begin',
      'P1-SILENCE': 'Start small',
      'P1-PRESSURE': 'Start (5 min)',
      'P1-BOOST': 'Go',
      'P1-RESCUE': 'Start',
      'P1-DEAL': 'Clear one first',
      'P1-PENDING': 'Continue',
    },
  },
};
