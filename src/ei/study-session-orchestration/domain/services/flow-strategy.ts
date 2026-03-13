/**
 * FlowStrategy — domain service for selecting the session flow template.
 *
 * Per tactical spec §2: same pattern as ProtocolEngine — stateless, spans multiple inputs, pure function.
 * Per ADR-005 §C7: deterministic — same inputs always produce the same output. No Math.random(), no Date.now().
 *
 * Selection precedence (from ADR-005 §FlowStrategy):
 *   1. Onboarding (first-time topic, no energy)
 *   2. Micro (timeboxMin === 1)
 *   3. Declared-standard (taskType present with energy)
 *   4. Negotiated-standard (default: ELI negotiation)
 */

import { FlowSelectionContext } from '../value-objects/flow-selection-context';
import { FlowTemplate } from '../value-objects/flow-template';

export class FlowStrategy {
  /**
   * Select the flow template for the given context.
   * Pure, deterministic. No side effects.
   */
  static select(ctx: FlowSelectionContext): FlowTemplate {
    if (ctx.isOnboarding) return FlowTemplate.onboarding();
    if (ctx.isMicro) return FlowTemplate.micro();
    if (ctx.hasTaskType) return FlowTemplate.declaredStandard();
    return FlowTemplate.negotiatedStandard();
  }
}
