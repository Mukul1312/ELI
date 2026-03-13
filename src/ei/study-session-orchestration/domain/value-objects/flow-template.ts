/**
 * FlowTemplate — value object representing a study session flow shape.
 *
 * Per tactical spec §3: static factories for a small fixed set of known templates.
 * Per ADR-005 §Cross-Protocol Invariant Analysis: "Skip" means "no UI", not "no event."
 * Every phase runs its handler (aggregate lifecycle + events); showUI controls SduiResponse only.
 *
 * Invariant (ADR-005 §C8, refined): "if session present, p3 must be present" applies to
 * the initial execution chain only. P3 is triggered later by SessionEnd command, not template-driven.
 */

export interface FlowPhase {
  readonly gate: 'p1' | 'p2' | 'session' | 'p3' | 'done';
  readonly showUI: boolean;
}

export class FlowTemplate {
  private constructor(
    readonly id: string,
    readonly phases: readonly FlowPhase[],
  ) {
    Object.freeze(this.phases);
    Object.freeze(this);
  }

  /**
   * Declared-standard: student declares own intent (no ELI negotiation).
   * P1 silent → P2 silent → session UI.
   * Per ADR-005 template matrix: RunDeclaredIntentHandler (no UI) → RunP2GateHandler (no UI) → session.
   */
  static declaredStandard(): FlowTemplate {
    return new FlowTemplate('declared-standard', [
      { gate: 'p1', showUI: false },
      { gate: 'p2', showUI: false },
      { gate: 'session', showUI: true },
    ]);
  }

  /**
   * Negotiated-standard: ELI engine negotiates intent with student.
   * P1 UI only — initial chain (canvas Q3: Option A).
   * P2 triggered later by IntentSet (R1.2 CommandRouter).
   */
  static negotiatedStandard(): FlowTemplate {
    return new FlowTemplate('negotiated-standard', [
      { gate: 'p1', showUI: true },
    ]);
  }

  /**
   * Onboarding: first-time topic setup.
   * P1 silent → P2 silent (ADR-005 §C8 fix: adds missing silent P2) → session UI.
   */
  static onboarding(): FlowTemplate {
    return new FlowTemplate('onboarding', [
      { gate: 'p1', showUI: false },
      { gate: 'p2', showUI: false },
      { gate: 'session', showUI: true },
    ]);
  }

  /**
   * Micro: quick micro-session, skips P1 entirely.
   * P2 UI → session UI.
   */
  static micro(): FlowTemplate {
    return new FlowTemplate('micro', [
      { gate: 'p2', showUI: true },
      { gate: 'session', showUI: true },
    ]);
  }
}
