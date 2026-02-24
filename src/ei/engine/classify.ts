/**
 * Classification facade — re-exports from domain/loop-health.
 * EI Runtime, protocol-runner, and callers import from here for backward compatibility.
 * Pure logic lives in domain/loop-health/assess-loop-health.ts.
 */

export {
  assignP1Label,
  assignP2Label,
  assignP3Label,
  resolveMode,
  classifyP1,
  classifyP2,
  classifyP3,
} from '../domain/loop-health/assess-loop-health';

export type {
  P1Label,
  P2Label,
  P3Label,
  Mode,
  P1Context,
  P2Context,
  P3Context,
  StudentAggregates,
  StudentPolicy,
  P1Classification,
  P2Classification,
  P3Classification,
} from '../domain/loop-health/assess-loop-health';

export type { StateTrend } from '../domain/loop-health/loop-health-snapshot';
