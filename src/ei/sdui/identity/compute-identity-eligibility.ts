/**
 * Identity eligibility computation — determines whether to show the identity moment card.
 *
 * Pure function: no DB access, no side effects.
 * The Mastra step calling composeCheckinView is responsible for persisting
 * the IdentityMomentShown event when eligible === true.
 *
 * @see docs/student-experience/08-footer-and-identity.md — trigger conditions
 * @see docs/student-experience/09-escalation-arc.md §4 — Day 21 identity moment
 */

import type { PresentationContext } from '../presentation-context';
import {
  IDENTITY_STATEMENTS,
  type IdentityPattern,
  type IdentityStatement,
} from '../microcopy/identity';

export interface IdentityEligibilityResult {
  eligible: boolean;
  pattern: IdentityPattern | null;
  statement: IdentityStatement | null;
}

/**
 * Compute whether the student is eligible to see an identity moment card.
 *
 * All four conditions must be true:
 * - verificationRate7d >= 0.70 (closing loops consistently)
 * - pendingChecks <= 2        (not overwhelmed by backlog)
 * - sessionsLast7d >= 4       (active this week)
 * - last shown >= 7 days ago  (rate-limited to once per week)
 */
export function computeIdentityEligibility(ctx: PresentationContext): IdentityEligibilityResult {
  const daysSinceLastShown =
    ctx.lastIdentityShownAt != null
      ? Math.floor((Date.now() - ctx.lastIdentityShownAt.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

  const eligible =
    ctx.verificationRate7d >= 0.7 &&
    ctx.pendingChecks <= 2 &&
    ctx.sessionsLast7d >= 4 &&
    daysSinceLastShown >= 7;

  if (!eligible) {
    return { eligible: false, pattern: null, statement: null };
  }

  const pattern = detectIdentityPattern(ctx);
  return {
    eligible: true,
    pattern,
    statement: IDENTITY_STATEMENTS[pattern],
  };
}

/** Detect identity pattern for eligibility or footer. Exported for footer statement. */
export function detectIdentityPattern(ctx: PresentationContext): IdentityPattern {
  // Priority order: most specific / most emotionally resonant first
  // Prefer historical resolution signals: had silence/pressure in last 14d, now active
  const activeThisWeek = ctx.sessionsLast7d >= 4;
  if (ctx.hadSilenceInLast14d && activeThisWeek) {
    return 'silence_resolved'; // "You came back."
  }
  if (ctx.hadHighPressureInLast14d && activeThisWeek) {
    return 'pressure_resolved'; // "Pressure days don't break you."
  }
  if (ctx.silenceDays >= 3 && activeThisWeek) {
    return 'silence_resolved'; // Fallback: current state
  }
  if (ctx.pressure >= 4 && activeThisWeek) {
    return 'pressure_resolved'; // Fallback: current state
  }
  if (ctx.verificationRate7d >= 0.8 && ctx.loopsClosedLast7d >= 3) {
    return 'integrity_consistent'; // "You're closing the loop."
  }
  if (ctx.pendingChecks === 0) {
    return 'zero_pending'; // "Everything you've studied, you've proved."
  }
  return 'generic'; // "Consistency is harder than intensity."
}
