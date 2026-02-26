/**
 * Identity statement library — earned behavioral reflections shown on the weekly identity card.
 *
 * These are mirrors, not rewards. Each statement reflects a real pattern in the student's
 * behavior over the past 7 days. They are shown at most once per 7 days when eligibility
 * conditions are met (see compute-identity-eligibility.ts).
 *
 * @see docs/student-experience/08-footer-and-identity.md — trigger conditions and card design
 * @see docs/student-experience/10-microcopy-bible.md §7 — statement source list
 */

export type IdentityPattern =
  | 'silence_resolved'
  | 'pressure_resolved'
  | 'integrity_consistent'
  | 'technique_improved'
  | 'zero_pending'
  | 'generic';

export interface IdentityStatement {
  /** The bold headline statement — reflects the student's behavioral pattern. */
  statement: string;
  /** 1-2 sentence factual summary shown below the statement. */
  detail: string;
}

/** Primary identity statements keyed by detected behavioral pattern. */
export const IDENTITY_STATEMENTS: Record<IdentityPattern, IdentityStatement> = {
  silence_resolved: {
    statement: 'You came back. That matters.',
    detail: 'After a quiet stretch, you returned and kept going. That\'s harder than it looks.',
  },
  pressure_resolved: {
    statement: "Pressure days don't break you anymore — you still start.",
    detail: 'Even on high-pressure days this week, you opened the app and did something.',
  },
  integrity_consistent: {
    statement: "You're not just studying — you're closing the loop.",
    detail: 'You studied and proved recall. That\'s the difference between covering and knowing.',
  },
  technique_improved: {
    statement: "You're studying differently now. It shows.",
    detail: 'Your verification rate is up. The method is working.',
  },
  zero_pending: {
    statement: 'Everything you\'ve studied, you\'ve also proved.',
    detail: '0 pending checks. Every topic has been verified.',
  },
  generic: {
    statement: 'Consistency is harder than intensity. You\'re proving that.',
    detail: 'Four or more sessions this week. The habit is forming.',
  },
};

/** CTA label shown on the identity moment card. */
export const IDENTITY_CTA_LABEL = "Let's keep going";
