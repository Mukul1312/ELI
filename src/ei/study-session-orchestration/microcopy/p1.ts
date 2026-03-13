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
      'P1-RESCUE': "Let's keep it simple today.",
      // CLEAN_START: Clean Slate mode, default
      'P1-CLEAN': "What are you working on today?",
      // DEAL_CARD: pending >= 3
      'P1-DEAL': 'A few things are waiting. Deal: clear one, then continue.',
      // PENDING_STANDARD: pending > 0, Neutral
      'P1-PENDING': 'A few things to pick up.',
      // ONBOARDING: first session ever
      'P1-ONBOARD': "Welcome. Let's set up.",
      // LOW_ENERGY: Energy 1–2, Rescue variant V2
      'P1-LOW-ENERGY': 'Keep it small today.',
      // CLEAR_THEN_CHALLENGE: Boost + pendingChecks >= 1, variant V8
      'P1-CLEAR-CHALLENGE': "You've been working hard.",
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
      // P1-LOW-ENERGY sub-greeting is energy-level-dependent (1 vs 2) — handled in builder
      // CLEAR_THEN_CHALLENGE: dynamic count in body copy
      'P1-CLEAR-CHALLENGE': '{{count}} things you studied are waiting to be tested.',
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
  phase1_footer_pressure_label: { default: 'Pressure day. Smaller = better.' },
  phase1_high_pressure_greeting_p4: { default: "Your drive is real." },
  phase1_high_pressure_greeting_p5: {
    default: "Your drive is real.\nBut today's pressure is high.",
  },
  phase1_high_pressure_body_p4: { default: 'High pressure today. One step.' },
  phase1_high_pressure_body_p5: {
    default: "We're not committing to hours.\nStart with one tiny step.",
  },
  phase1_high_pressure_cta: { default: 'Start 2 minutes, then decide' },
  phase1_high_pressure_cta_smaller: { default: 'Make it smaller' },
  phase1_make_it_smaller_greeting: { default: "Just 1 minute.\nAnything counts." },
  phase1_make_it_smaller_cta: { default: '1 minute, then stop' },
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
      'P1-LOW-ENERGY': 'Short session (15 min)',
      'P1-CLEAR-CHALLENGE': 'Clear 1 first, then go big',
    },
  },
  // ─── Tier 2/3 observations (Session 5+) ──────────────────────────────────
  // Tier 2 (5–6 sessions): hedged language
  obs_energy_t2: { default: 'Good energy most of this week.' },
  obs_closure_t2: { default: 'You seem to close loops fast.' },
  obs_trend_t2: { default: 'Things seem to be looking up.' },
  obs_count_t2: { default: '{{count}} sessions in.' },
  // Tier 3 (7+ sessions): assertive language
  obs_energy_t3: { default: 'Good energy again. You tend to show up ready.' },
  obs_closure_t3: { default: 'You tend to close loops fast.' },
  obs_trend_t3: { default: 'Things are looking up.' },
  obs_count_t3: { default: '{{count}} sessions this week. Consistent.' },
};
