/**
 * DTO for aggregates data passed into PresentationContext builders.
 *
 * Presentation layer must not depend on persistence row types (AggregatesRow).
 * Mapping from DB rows happens in the application/workflow boundary.
 */

import type { StateTrend } from '../../../domain/student-aggregates/student-aggregates';

export interface AggregatesForPresentation {
  readonly pendingChecks: number;
  readonly silenceDays: number;
  readonly verificationRate7d: number;
  readonly stateTrend7d: StateTrend;
}
