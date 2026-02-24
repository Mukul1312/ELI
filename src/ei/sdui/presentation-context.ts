/**
 * PresentationContext — derived entirely from domain output fields.
 *
 * The ViewComposer needs this to decide which components to include
 * (deal card, welcome-back, guardrails) and which microcopy to resolve.
 *
 * ZERO DB calls — all fields are extracted from the protocol handler output
 * and the workflow input that was already loaded.
 */

import type { Mode } from '../schemas/outputs';

export interface PresentationContext {
  readonly studentId: string;
  readonly topicId: string;
  readonly mode: Mode;
  readonly playId: string;
  readonly stateScore: number;
  readonly pendingChecks: number;
  readonly silenceDays: number;
  readonly isFirstOfDay: boolean;
  readonly tightnessLevel: 'Loose' | 'Normal' | 'Tight';
  readonly energy: number;
  readonly pressure: number;
  readonly closeOpenLoopFirst: boolean;
}

/**
 * Build a PresentationContext from the P1 domain output and workflow input.
 *
 * The domain output already contains mode, playId, stateScore, and constraints.
 * The remaining fields (pendingChecks, silenceDays, etc.) are approximated from
 * what the domain output tells us — e.g. if closeOpenLoopFirst is set, pendingChecks >= 3.
 */
export function buildP1PresentationContext(
  domainOutput: {
    studentId: string;
    topic: string;
    mode: Mode;
    playId: string;
    stateScore: number;
    constraints?: { closeOpenLoopFirst?: boolean; noNewTopicUntil?: string };
  },
  workflowInput: {
    energy: number;
    pressure: number;
  },
): PresentationContext {
  return {
    studentId: domainOutput.studentId,
    topicId: domainOutput.topic,
    mode: domainOutput.mode,
    playId: domainOutput.playId,
    stateScore: domainOutput.stateScore,
    // When closeOpenLoopFirst is set, we know pendingChecks >= 3 (from domain invariant)
    pendingChecks: domainOutput.constraints?.closeOpenLoopFirst ? 3 : 0,
    // Approximate: if Rescue mode + low stateScore, may have silence — but we don't know exact days
    // For v1, silenceDays is not available in P1 output; default 0
    silenceDays: 0,
    isFirstOfDay: true, // For v1, assume first-of-day (server can refine later)
    tightnessLevel: 'Normal', // Not in P1 output; default Normal
    energy: workflowInput.energy,
    pressure: workflowInput.pressure,
    closeOpenLoopFirst: domainOutput.constraints?.closeOpenLoopFirst ?? false,
  };
}
