/**
 * Catalog coverage test — ensures all plays have non-empty microcopy for required slots.
 */

import { describe, it, expect } from 'vitest';
import { P1_PLAYS, P2_PLAYS, P3_PLAYS } from '../../engine/plays';
import { microcopyCatalog } from '../microcopy/catalog';
import { resolveMicrocopy } from '../microcopy/resolver';
import type { MicrocopyKey } from '../microcopy/resolver';

const MODES = ['Rescue', 'Neutral', 'Boost'] as const;

const P1_REQUIRED_SLOTS: MicrocopyKey['slot'][] = [
  'scope_title',
  'scope_message',
  'deal_card_message',
  'deal_card_choice_clear',
  'deal_card_choice_schedule',
  'welcome_back_greeting',
  'welcome_back_suggestion',
  'pending_checks_label',
];

const P2_REQUIRED_SLOTS: MicrocopyKey['slot'][] = [
  'activation_title',
  'activation_description',
];

const P3_REQUIRED_SLOTS: MicrocopyKey['slot'][] = [
  'verification_title',
  'verify_now_prompt',
  'schedule_prompt',
  'skip_prompt',
  'done_title',
  'celebration_message',
];

function makeKey(
  gate: 'P1' | 'P2' | 'P3',
  playId: string,
  mode: (typeof MODES)[number],
  slot: string
): MicrocopyKey {
  return { gate, slot: slot as MicrocopyKey['slot'], mode, playId };
}

describe('microcopy catalog coverage', () => {
  it('P1: all plays resolve non-empty for required slots', () => {
    for (const play of P1_PLAYS) {
      for (const mode of MODES) {
        for (const slot of P1_REQUIRED_SLOTS) {
          const key = makeKey('P1', play.id, mode, slot);
          const result = resolveMicrocopy(
            microcopyCatalog,
            key,
            slot === 'pending_checks_label' || slot === 'deal_card_message' ? { count: 1 } : {}
          );
          expect(result, `P1 ${play.id} ${mode} ${slot}`).toBeTruthy();
          expect(result.length, `P1 ${play.id} ${mode} ${slot} should not be empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('P2: all plays resolve non-empty for required slots', () => {
    for (const play of P2_PLAYS) {
      for (const mode of MODES) {
        for (const slot of P2_REQUIRED_SLOTS) {
          const key = makeKey('P2', play.id, mode, slot);
          const result = resolveMicrocopy(microcopyCatalog, key, {});
          expect(result, `P2 ${play.id} ${mode} ${slot}`).toBeTruthy();
          expect(result.length, `P2 ${play.id} ${mode} ${slot}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('P3: all plays resolve non-empty for required slots', () => {
    const vars: Record<string, string | number> = {
      count: 1,
      hours: 24,
    };
    for (const play of P3_PLAYS) {
      for (const mode of MODES) {
        for (const slot of P3_REQUIRED_SLOTS) {
          const key = makeKey('P3', play.id, mode, slot);
          const result = resolveMicrocopy(microcopyCatalog, key, vars);
          expect(result, `P3 ${play.id} ${mode} ${slot}`).toBeTruthy();
          expect(result.length, `P3 ${play.id} ${mode} ${slot}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
