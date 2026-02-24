/**
 * Microcopy catalog — all student-facing text organized by gate/slot/mode/play.
 *
 * Elder brother tone: calm, brief, evidence-based, non-judgmental.
 * @see docs/ux-design-brief.md §4 — Core UX Philosophy
 * @see EI_Storyboard_S2, S5, S7 — storyboard microcopy sources
 */

import type { Mode } from '../../schemas/outputs';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type MicrocopySlot =
  // P1 slots
  | 'scope_title'
  | 'scope_message'
  | 'deal_card_message'
  | 'deal_card_choice_clear'
  | 'deal_card_choice_schedule'
  // Shared slots
  | 'checkin_energy_label'
  | 'checkin_sleep_label'
  | 'checkin_backlog_label'
  | 'checkin_pressure_label'
  | 'checkin_pressure_toggle'
  | 'welcome_back_greeting'
  | 'welcome_back_suggestion'
  | 'pending_checks_label';

export interface SlotCatalog {
  default: string;
  byMode?: Partial<Record<Mode, string>>;
  byPlay?: Record<string, string>;
}

export interface GateCatalog {
  [slot: string]: SlotCatalog;
}

export interface MicrocopyCatalog {
  P1: GateCatalog;
  P2: GateCatalog;
  P3: GateCatalog;
  _fallback: string;
}

// ────────────────────────────────────────────────────────────────────────────
// The Catalog
// ────────────────────────────────────────────────────────────────────────────

export const microcopyCatalog: MicrocopyCatalog = {
  _fallback: '',

  P1: {
    // ── Scope card ────────────────────────────────────────────────────────
    scope_title: {
      default: 'Your Plan',
    },

    scope_message: {
      default: "Here's your plan for today.",
      byMode: {
        Rescue: "Today's energy is low — shorter scope keeps the loop moving.",
        Neutral: "Here's your plan. Minor adjustments to keep things balanced.",
        Boost: "You're fully charged. Let's raise the bar.",
      },
      byPlay: {
        // S2 archetype: revenge planning after bad mock
        'P1-R3': "Your drive is real. But today's pressure is high. Let's make a plan you can actually start.",
        // S5 archetype: burnout/silence
        'P1-R1': 'No speeches. Let\'s keep it tiny. Just one small step today.',
        // Close open loop
        'P1-R2': "You're active, but proof is lagging. Let's close the oldest check first — tiny verify, then continue.",
        // Integrity-first
        'P1-N2': 'Solid energy today. Let\'s make sure sessions count — quick check at the end.',
        // Tier boost
        'P1-B1': "You're in the zone. Let's push the difficulty up — not the hours.",
        // Challenge density
        'P1-B2': 'Good momentum. Let\'s add density — harder problems, same timebox.',
        // Weak-topic-first
        'P1-B3': "Strong day. Let's spend it on something you've been avoiding.",
      },
    },

    // ── Deal card ─────────────────────────────────────────────────────────
    deal_card_message: {
      default: 'You have {{count}} pending checks. Deal: clear the oldest one first, then go big.',
      byMode: {
        Rescue: "You have {{count}} pending checks. Let's close the oldest one — tiny verify, then continue.",
        Neutral: 'You have {{count}} pending checks. Deal: clear 1 first, then go big.',
        Boost: '{{count}} pending checks in the queue. Clear 1 fast, then push harder.',
      },
    },

    deal_card_choice_clear: {
      default: 'Clear oldest check now',
    },

    deal_card_choice_schedule: {
      default: 'Clear one check tomorrow (24h)',
    },

    // ── Checkin scales ────────────────────────────────────────────────────
    checkin_energy_label: {
      default: "How's your energy right now?",
    },

    checkin_sleep_label: {
      default: 'How did you sleep?',
    },

    checkin_backlog_label: {
      default: 'How behind do you feel?',
    },

    checkin_pressure_label: {
      default: 'How stressed are you feeling?',
    },

    checkin_pressure_toggle: {
      default: '+ More context',
    },

    // ── Welcome back ──────────────────────────────────────────────────────
    welcome_back_greeting: {
      default: "Welcome back. Let's keep it tiny today.",
      byPlay: {
        'P1-R1': "Welcome back. Today is not a comeback story. It's a 5-minute win.",
      },
    },

    welcome_back_suggestion: {
      default: 'Pick the smallest thing you can do right now.',
    },

    // ── Pending checks ───────────────────────────────────────────────────
    pending_checks_label: {
      default: 'Pending checks: {{count}}',
    },
  },

  // P2 and P3 catalogs — stubs for Phase 3 implementation
  P2: {},
  P3: {},
};
