/**
 * Radar Store tools: upsertRadarAlert, getRadarAlerts
 *
 * Privacy boundary: these are the ONLY tools the institute API should call.
 * They never expose raw events or private student content.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as Q from '../../ei/db/queries';

export const upsertRadarAlertTool = createTool({
  id: 'upsert-radar-alert',
  description: 'Create or update a radar alert (deduplicates by student + alertType)',
  inputSchema: z.object({
    studentId: z.string(),
    batchId: z.string(),
    alertType: z.string(),
    severity: z.string(),
    evidenceSummary: z.record(z.unknown()),
    recommendedAction: z.string(),
  }),
  outputSchema: z.object({
    alertId: z.string(),
    isNew: z.boolean(),
  }),
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const { row, isNew } = await Q.upsertRadarAlert(
      db,
      input.studentId,
      input.batchId,
      input.alertType,
      input.severity,
      input.evidenceSummary,
      input.recommendedAction,
    );
    return { alertId: row.id, isNew };
  },
});

export const getRadarAlertsTool = createTool({
  id: 'get-radar-alerts',
  description: 'Query radar alerts with optional filters (institute-facing, privacy-safe)',
  inputSchema: z.object({
    filters: z.object({
      studentId: z.string().optional(),
      alertType: z.string().optional(),
      severity: z.string().optional(),
      batchId: z.string().optional(),
    }).optional(),
    limit: z.number().int().default(100),
    offset: z.number().int().default(0),
  }),
  outputSchema: z.object({
    alerts: z.array(z.object({
      id: z.string(),
      studentId: z.string(),
      batchId: z.string(),
      alertType: z.string(),
      severity: z.string(),
      evidenceSummary: z.record(z.unknown()),
      recommendedAction: z.string(),
      lastUpdatedAt: z.string(),
    })),
    total: z.number(),
  }),
  execute: async (input) => {
    const db = (globalThis as any).__eiDb;
    const { alerts, total } = await Q.getRadarAlerts(
      db,
      input.filters,
      input.limit,
      input.offset,
    );
    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        studentId: a.student_id,
        batchId: a.batch_id,
        alertType: a.alert_type,
        severity: a.severity,
        evidenceSummary: a.evidence_summary,
        recommendedAction: a.recommended_action,
        lastUpdatedAt: a.last_updated_at.toISOString(),
      })),
      total,
    };
  },
});
