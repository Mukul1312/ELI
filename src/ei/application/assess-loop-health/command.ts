import type { P1Context, P2Context, P3Context } from '../../domain/loop-health/gate-context';
import type { StudentAggregatesInput, StudentPolicyInput } from '../../domain/loop-health/aggregates-input';

export type GatePhase = 'P1' | 'P2' | 'P3';

export interface AssessLoopHealthCommand {
  studentId: string;
  gatePhase?: GatePhase;
  gateContext: P1Context | P2Context | P3Context;
  aggregates?: StudentAggregatesInput;
  policy?: StudentPolicyInput;
}
