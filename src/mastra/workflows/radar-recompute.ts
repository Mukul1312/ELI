/**
 * Radar Pipeline: Recompute workflow
 *
 * Runs nightly (batch) or on event-driven threshold flips.
 *
 * Flow:
 *   loadStudentList      -> tool: listStudents
 *   computeAllAggregates -> tool: computeAggregates (per student loop)
 *   checkOverdue         -> tool: checkOverdueSchedules
 *   evaluateAlerts       -> pure: evaluate alert thresholds from EI_Spec.md 4.15
 *   upsertAlerts         -> tool: upsertRadarAlert (dedupe + priority)
 *
 * Alert priority (from EI_Spec.md):
 *   Silence > IntegrityDebt > VerificationDrop > BurnoutRunway > SubjectAvoidance
 *
 * @see EI_Spec.md section 4.15
 */

import { createStep } from '@mastra/core/workflows';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import {
  SILENCE_DAYS_THRESHOLD,
  OPEN_LOOPS_THRESHOLD,
  VERIFICATION_RATE_LOW,
  SCHEDULE_MISSES_THRESHOLD,
  AVOIDANT_EXITS_THRESHOLD,
} from '../../ei/engine/tunables';

// ============================================================================
// Types
// ============================================================================

interface StudentAggregates {
  studentId: string;
  silenceDays: number;
  openLoops: number;
  verificationRate7d: number;
  scheduleMisses7d: number;
  avoidantExits7d: number;
  stateTrend7d: string;
  pendingChecks: number;
}

interface AlertCandidate {
  studentId: string;
  alertType: string;
  severity: string;
  evidenceSummary: Record<string, unknown>;
  recommendedAction: string;
}

// ============================================================================
// Step 1: Load student list
// ============================================================================

const loadStudentList = createStep({
  id: 'load-student-list',
  inputSchema: z.object({
    batchId: z.string(),
    activeWithinDays: z.number().int().default(30),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    // tool: listStudents({ activeWithinDays })
    // placeholder: returns empty; actual implementation calls the tool
    return {
      ...inputData,
      studentIds: [] as string[],
    };
  },
});

// ============================================================================
// Step 2: Compute aggregates for all students
// ============================================================================

const computeAllAggregates = createStep({
  id: 'compute-all-aggregates',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentIds } = inputData;
    // For each student: tool: computeAggregates({ studentId })
    // placeholder: returns empty array
    const allAggregates: StudentAggregates[] = [];

    return {
      ...inputData,
      allAggregates,
    };
  },
});

// ============================================================================
// Step 3: Evaluate alert thresholds (pure)
// ============================================================================

const evaluateAlerts = createStep({
  id: 'evaluate-alerts',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { allAggregates, batchId } = inputData;
    const alertCandidates: AlertCandidate[] = [];

    for (const agg of allAggregates as StudentAggregates[]) {
      // Priority 1: Silence (student hasn't engaged)
      if (agg.silenceDays >= SILENCE_DAYS_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId,
          alertType: 'Silence',
          severity: agg.silenceDays >= 5 ? 'critical' : agg.silenceDays >= 3 ? 'high' : 'medium',
          evidenceSummary: { silenceDays: agg.silenceDays },
          recommendedAction: agg.silenceDays >= 5
            ? 'Immediate counselor check-in recommended'
            : 'Gentle re-engagement nudge suggested',
        });
        continue; // highest priority -- skip lower alerts for this student
      }

      // Priority 2: IntegrityDebt (open loops accumulating)
      if (agg.openLoops >= OPEN_LOOPS_THRESHOLD || agg.scheduleMisses7d >= SCHEDULE_MISSES_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId,
          alertType: 'IntegrityDebt',
          severity: agg.openLoops >= 5 ? 'high' : 'medium',
          evidenceSummary: { openLoops: agg.openLoops, scheduleMisses7d: agg.scheduleMisses7d },
          recommendedAction: 'Student has accumulating WIP debt; verify study plan feasibility',
        });
        continue;
      }

      // Priority 3: VerificationDrop
      if (agg.verificationRate7d < VERIFICATION_RATE_LOW) {
        alertCandidates.push({
          studentId: agg.studentId,
          alertType: 'VerificationDrop',
          severity: agg.verificationRate7d < 0.40 ? 'high' : 'medium',
          evidenceSummary: { verificationRate7d: agg.verificationRate7d },
          recommendedAction: 'Student is skipping retrieval practice; may need verification format adjustment',
        });
        continue;
      }

      // Priority 4: BurnoutRunway
      if (agg.stateTrend7d === 'worsening' && agg.avoidantExits7d >= AVOIDANT_EXITS_THRESHOLD) {
        alertCandidates.push({
          studentId: agg.studentId,
          alertType: 'BurnoutRunway',
          severity: 'medium',
          evidenceSummary: {
            stateTrend: agg.stateTrend7d,
            avoidantExits7d: agg.avoidantExits7d,
          },
          recommendedAction: 'Student shows signs of declining engagement; consider scope reduction',
        });
      }

      // Priority 5: SubjectAvoidance is checked per-topic (simplified here)
    }

    return {
      ...inputData,
      alertCandidates,
    };
  },
});

// ============================================================================
// Step 4: Upsert alerts (tools)
// ============================================================================

const upsertAlerts = createStep({
  id: 'upsert-alerts',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { alertCandidates, batchId } = inputData;
    const results: Array<{ alertId: string; isNew: boolean }> = [];

    // For each candidate: tool: upsertRadarAlert({ ...candidate, batchId })
    // placeholder: actual implementation calls the tool

    return {
      batchId,
      alertsProcessed: (alertCandidates as AlertCandidate[]).length,
      results,
    };
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const radarRecomputeWorkflow = createWorkflow({
  id: 'ei-radar-recompute',
  inputSchema: z.object({
    batchId: z.string(),
    activeWithinDays: z.number().int().default(30),
  }),
  outputSchema: z.any(),
})
  .then(loadStudentList)
  .then(computeAllAggregates)
  .then(evaluateAlerts)
  .then(upsertAlerts)
  .commit();
