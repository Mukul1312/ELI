/**
 * StudySession bounded context — domain barrel.
 * Per ei-runtime-tactical-spec.md §10 file structure.
 */

export { StudySession } from './study-session';
export type { SessionStatus } from './study-session';

export { NegotiatedIntent } from './value-objects/negotiated-intent';
export type { DifficultyTier } from './value-objects/negotiated-intent';

export { DeclaredIntent } from './value-objects/declared-intent';
export type { DeclaredIntentInput } from './value-objects/declared-intent';

export { ActivationPlan } from './value-objects/activation-plan';

export { VerificationDecision } from './value-objects/verification-decision';
export type { VerificationDecisionType } from './value-objects/verification-decision';

export { PlaySelection } from './value-objects/play-selection';

export { P1GateContext, P2GateContext, P3GateContext } from './value-objects/gate-context';

export { ProtocolEngine } from './protocol-engine';
export type { IProtocolEngine } from './protocol-engine';

export {
  SessionAlreadyClosedError,
  InvalidGateOrderError,
  InvalidGateContextError,
  PlaySelectionError,
  SessionLifecycleError,
} from './errors';
