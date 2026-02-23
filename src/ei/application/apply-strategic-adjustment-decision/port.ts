import type { ApplyStrategicAdjustmentDecisionCommand } from './command';

export interface IApplyStrategicAdjustmentDecisionUseCase {
  execute(command: ApplyStrategicAdjustmentDecisionCommand): Promise<void>;
}

/** Parsed StrategicAdjustmentDecision from the Ledger; used for replay/recompute. */
export interface StoredStrategicAdjustmentDecision {
  studentId: string;
  tightnessLevel: string;
  adjustmentMode: string | null;
  dials: Record<string, unknown>;
  constraints: Record<string, unknown>;
  issuedAt: Date;
}

/** Driven port: read StrategicAdjustmentDecision events from the Ledger for replay/recompute. */
export interface IStrategicAdjustmentDecisionEventReader {
  readLatestDecision(studentId: string): Promise<StoredStrategicAdjustmentDecision | null>;
}
