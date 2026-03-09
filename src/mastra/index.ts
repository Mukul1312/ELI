import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';
import { VercelDeployer } from "@mastra/deployer-vercel";
import {
  Observability,
  DefaultExporter,
  SensitiveDataFilter,
} from '@mastra/observability';

// Tools
import { appendEventTool, queryEventsTool } from './tools/event-store';
import { computeAggregatesTool, checkOverdueSchedulesTool, listStudentsTool } from './tools/signal-compute';
import { recomputeTopicLoopTool } from './tools/recompute-topic-loop';
import { recomputeStudentPolicyTool } from './tools/recompute-student-policy';
import { getTopicStateTool, getAllTopicStatesTool, updateTMSTool } from './tools/tms-store';
import { getPolicyTool, setPolicyTool } from './tools/policy-store';
import { upsertRadarAlertTool, getRadarAlertsTool } from './tools/radar-store';
import { backfillTopicNamesTool } from './tools/backfill-topic-names';

// Workflows
import { protocol1IgnitionWorkflow } from './workflows/protocol1-ignition';
import { protocol2ActivationWorkflow } from './workflows/protocol2-activation';
import { protocol3VerificationWorkflow } from './workflows/protocol3-verification';
import { strategicAdjustmentWorkflow } from './workflows/strategic-adjustment';
import { radarRecomputeWorkflow } from './workflows/radar-recompute';
import { eiAppOpenWorkflow } from './workflows/ei-app-open';
import { checkinViewWorkflow } from './workflows/checkin-view';
import { sessionStartWorkflow } from './workflows/session-start';
import { replanWorkflow } from './workflows/replan';
import { verificationCompleteWorkflow } from './workflows/verification-complete';
import { retrievalScheduleWorkflow } from './workflows/retrieval-schedule';
import { retrievalSkipWorkflow } from './workflows/retrieval-skip';

const storage = new PostgresStore({
  id: 'ei-storage',
  connectionString: process.env.DATABASE_URL!,
});

export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'ai-study-brother',
        exporters: [new DefaultExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  deployer: new VercelDeployer({
    // optional but useful for longer workflows/batches
    // maxDuration: 300,
    // memory: 1024,
    // regions: ["iad1"],
  }),
  storage,
  workflows: {
    protocol1IgnitionWorkflow,
    protocol2ActivationWorkflow,
    protocol3VerificationWorkflow,
    strategicAdjustmentWorkflow,
    radarRecomputeWorkflow,
    eiAppOpenWorkflow,
    checkinViewWorkflow,
    sessionStartWorkflow,
    replanWorkflow,
    verificationCompleteWorkflow,
    retrievalScheduleWorkflow,
    retrievalSkipWorkflow,
  },
  tools: {
    appendEventTool,
    queryEventsTool,
    computeAggregatesTool,
    checkOverdueSchedulesTool,
    listStudentsTool,
    recomputeTopicLoopTool,
    recomputeStudentPolicyTool,
    getTopicStateTool,
    getAllTopicStatesTool,
    updateTMSTool,
    getPolicyTool,
    setPolicyTool,
    upsertRadarAlertTool,
    getRadarAlertsTool,
    backfillTopicNamesTool,
  },
});
