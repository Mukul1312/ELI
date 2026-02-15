import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';

// Tools
import { appendEventTool, queryEventsTool } from './tools/event-store';
import { computeAggregatesTool, checkOverdueSchedulesTool, listStudentsTool } from './tools/signal-compute';
import { getTopicStateTool, getAllTopicStatesTool, updateTMSTool } from './tools/tms-store';
import { getPolicyTool, setPolicyTool } from './tools/policy-store';
import { upsertRadarAlertTool, getRadarAlertsTool } from './tools/radar-store';

// Workflows
import { protocol1IgnitionWorkflow } from './workflows/protocol1-ignition';
import { protocol2ActivationWorkflow } from './workflows/protocol2-activation';
import { protocol3VerificationWorkflow } from './workflows/protocol3-verification';
import { strategicAdjustmentWorkflow } from './workflows/strategic-adjustment';
import { radarRecomputeWorkflow } from './workflows/radar-recompute';

const storage = new PostgresStore({
  id: 'ei-storage',
  connectionString: process.env.DATABASE_URL!,
});

export const mastra = new Mastra({
  storage,
  workflows: {
    protocol1IgnitionWorkflow,
    protocol2ActivationWorkflow,
    protocol3VerificationWorkflow,
    strategicAdjustmentWorkflow,
    radarRecomputeWorkflow,
  },
  tools: {
    appendEventTool,
    queryEventsTool,
    computeAggregatesTool,
    checkOverdueSchedulesTool,
    listStudentsTool,
    getTopicStateTool,
    getAllTopicStatesTool,
    updateTMSTool,
    getPolicyTool,
    setPolicyTool,
    upsertRadarAlertTool,
    getRadarAlertsTool,
  },
});
