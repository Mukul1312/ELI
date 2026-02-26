/**
 * Microcopy catalog — all student-facing text organized by gate/slot/mode/play.
 *
 * Composes per-gate catalogs. Elder brother tone: calm, brief, evidence-based, non-judgmental.
 * @see docs/ux-design-brief.md §4 — Core UX Philosophy
 * @see EI_Storyboard_S2, S5, S7 — storyboard microcopy sources
 */

import type { Mode } from '../../schemas/outputs';
import { P1_CATALOG } from './p1';
import { P2_CATALOG } from './p2';
import { P3_CATALOG } from './p3';
import type { GateCatalog, SlotCatalog } from './types';

export type { GateCatalog, SlotCatalog } from './types';

export type MicrocopySlot =
  | 'scope_title'
  | 'scope_message'
  | 'deal_card_message'
  | 'deal_card_choice_clear'
  | 'deal_card_choice_schedule'
  | 'checkin_energy_label'
  | 'checkin_sleep_label'
  | 'checkin_backlog_label'
  | 'checkin_pressure_label'
  | 'checkin_pressure_toggle'
  | 'welcome_back_greeting'
  | 'welcome_back_suggestion'
  | 'pending_checks_label'
  | 'activation_title'
  | 'activation_description'
  | 'focus_note'
  | 'verification_title'
  | 'verify_now_prompt'
  | 'schedule_prompt'
  | 'skip_prompt'
  | 'done_title'
  | 'celebration_message'
  // Phase 1 "The Open" — variant-specific greeting copy (WS7)
  | 'phase1_greeting'
  | 'phase1_sub_greeting'
  | 'phase1_pending_items_label'
  | 'phase1_footer_warm_label'
  | 'phase1_cta'
  // Phase 3 "The Close" — scenario-specific copy (WS7)
  | 'close_verified'
  | 'close_reminded'
  | 'close_skip_time'
  | 'close_skip_fatigue'
  | 'close_skip_confusion'
  | 'close_milestone'
  | 'close_first_ever'
  | 'phase3_done_verified'
  | 'phase3_done_milestone'
  | 'phase3_done_first_ever'
  | 'phase3_done_reminded'
  | 'phase3_done_skip_time'
  | 'phase3_done_skip_fatigue'
  | 'phase3_done_skip_confusion'
  | 'seed_verified'
  | 'seed_reminded';

export interface MicrocopyCatalog {
  P1: GateCatalog;
  P2: GateCatalog;
  P3: GateCatalog;
  _fallback: string;
}

export const microcopyCatalog: MicrocopyCatalog = {
  _fallback: '',
  P1: P1_CATALOG,
  P2: P2_CATALOG,
  P3: P3_CATALOG,
};
