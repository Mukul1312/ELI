/**
 * SelectFlowHandler — application-layer orchestrator for R1.1 SelectFlow.
 *
 * Per ADR-005 §C6 pseudocode:
 *   1. Load aggregates + policy via driven ports (parallel I/O)
 *   2. Build FlowSelectionContext VO (domain validation)
 *   3. Call FlowStrategy.select() (pure domain)
 *   4. Append FlowSelected event via IEventAppender
 *   5. Return { template, ctx }
 *
 * Per tactical spec §7: thin orchestration — no business logic in handler.
 * Per canvas R1.1: "SSO decides, Mastra executes."
 */

import type { IStudentAggregatesQuery } from '../shared/port-student-aggregates-query';
import type { IStudentPolicyQuery } from '../shared/port-student-policy-query';
import type { IEventAppender } from '../shared/port-event-appender';
import type { SelectFlowCommand } from './command';
import type { ISelectFlowUseCase, SelectFlowResult } from './port';
import { FlowSelectionContext } from '../../domain/value-objects/flow-selection-context';
import { FlowStrategy } from '../../domain/services/flow-strategy';

export class SelectFlowHandler implements ISelectFlowUseCase {
  constructor(
    private readonly aggregatesQuery: IStudentAggregatesQuery,
    private readonly policyQuery: IStudentPolicyQuery,
    private readonly eventAppender: IEventAppender,
  ) {}

  async execute(command: SelectFlowCommand): Promise<SelectFlowResult> {
    const { studentId, topicId, taskType, isOnboarding, isMicro, sessionId, idempotencyKey } = command;

    // 1. Parallel I/O via driven ports
    const [aggregates, policy] = await Promise.all([
      this.aggregatesQuery.getAggregatesForFlow(studentId),
      this.policyQuery.getPolicyForFlow(studentId),
    ]);

    // 2. Build FlowSelectionContext VO (domain validation in create())
    const ctx = FlowSelectionContext.create({
      hasTaskType: taskType !== undefined,
      isOnboarding,
      isMicro,
      hasTopic: topicId !== undefined,
      sessionsTotal: aggregates?.sessionsTotal ?? 0,
      silenceDays: aggregates?.silenceDays ?? 0,
      pendingChecks: aggregates?.pendingChecks ?? 0,
      openLoops: aggregates?.openLoops ?? 0,
      cohortFlags: policy?.dials ?? {},
    });

    // 3. Pure domain call
    const template = FlowStrategy.select(ctx);

    // 4. Append FlowSelected event
    const selectedAt = new Date().toISOString();
    await this.eventAppender.append({
      studentId,
      eventType: 'FlowSelected',
      topicId: topicId ?? null,
      payload: {
        studentId,
        templateId: template.id,
        // Negotiated sessions: session identity is owned by protocol1-ignition (its own UUID).
        // Including command.sessionId would correlate FlowSelected to a UUID that never reaches the Ledger.
        sessionId: template.id !== 'negotiated-standard' ? sessionId : undefined,
        selectionContext: {
          hasTaskType: ctx.hasTaskType,
          isOnboarding: ctx.isOnboarding,
          isMicro: ctx.isMicro,
          hasTopic: ctx.hasTopic,
          sessionsTotal: ctx.sessionsTotal,
          silenceDays: ctx.silenceDays,
          pendingChecks: ctx.pendingChecks,
          openLoops: ctx.openLoops,
          cohortFlags: { ...ctx.cohortFlags },
        },
        selectedAt,
      },
      idempotencyKey: idempotencyKey
        ? `${idempotencyKey}:FlowSelected`
        : undefined,
    });

    // 5. Return result
    return { template, ctx };
  }
}
