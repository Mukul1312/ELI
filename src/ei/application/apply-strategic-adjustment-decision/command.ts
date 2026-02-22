export interface ApplyStrategicAdjustmentDecisionCommand {
  studentId: string;
  tightnessLevel: string;
  adjustmentMode: string | null;
  dials: Record<string, unknown>;
  constraints: Record<string, unknown>;
  issuedAt: Date;
}
