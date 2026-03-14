/**
 * SelectFlowHandler — application layer unit tests with in-memory fakes.
 *
 * Per tactical spec §13: "Application layer: unit, in-memory fakes — never mock domain."
 * Per ADR-005 §C7: handler calls FlowStrategy correctly, appends FlowSelected event.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelectFlowHandler } from '../application/select-flow/handler';
import type { SelectFlowCommand } from '../application/select-flow/command';
import type { IStudentAggregatesQuery, StudentAggregatesForFlow } from '../application/shared/port-student-aggregates-query';
import type { IStudentPolicyQuery, StudentPolicyForFlow } from '../application/shared/port-student-policy-query';
import type { IEventAppender, SsoEventPayload } from '../application/shared/port-event-appender';

// ── In-memory fakes ──

class FakeAggregatesQuery implements IStudentAggregatesQuery {
  private data: Map<string, StudentAggregatesForFlow> = new Map();

  set(studentId: string, agg: StudentAggregatesForFlow) {
    this.data.set(studentId, agg);
  }

  async getAggregatesForFlow(studentId: string): Promise<StudentAggregatesForFlow | null> {
    return this.data.get(studentId) ?? null;
  }
}

class FakePolicyQuery implements IStudentPolicyQuery {
  private data: Map<string, StudentPolicyForFlow> = new Map();

  set(studentId: string, policy: StudentPolicyForFlow) {
    this.data.set(studentId, policy);
  }

  async getPolicyForFlow(studentId: string): Promise<StudentPolicyForFlow | null> {
    return this.data.get(studentId) ?? null;
  }
}

class FakeEventAppender implements IEventAppender {
  readonly events: SsoEventPayload[] = [];

  async append(event: SsoEventPayload): Promise<void> {
    this.events.push(event);
  }
}

// ── Tests ──

describe('SelectFlowHandler', () => {
  let aggregatesQuery: FakeAggregatesQuery;
  let policyQuery: FakePolicyQuery;
  let eventAppender: FakeEventAppender;
  let handler: SelectFlowHandler;

  beforeEach(() => {
    aggregatesQuery = new FakeAggregatesQuery();
    policyQuery = new FakePolicyQuery();
    eventAppender = new FakeEventAppender();
    handler = new SelectFlowHandler(aggregatesQuery, policyQuery, eventAppender);
  });

  const defaultAggregates: StudentAggregatesForFlow = {
    sessionsTotal: 10,
    silenceDays: 0,
    pendingChecks: 2,
    openLoops: 1,
  };

  function baseCommand(overrides: Partial<SelectFlowCommand> = {}): SelectFlowCommand {
    return {
      studentId: 'student-1',
      topicId: 'topic-1',
      isOnboarding: false,
      isMicro: false,
      sessionId: 'test-session-uuid',
      ...overrides,
    };
  }

  // ── Template selection ──

  it('selects negotiated-standard when no taskType, not onboarding, not micro', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    const result = await handler.execute(baseCommand());
    expect(result.template.id).toBe('negotiated-standard');
  });

  it('selects declared-standard when taskType present', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    const result = await handler.execute(baseCommand({ taskType: 'Practice' }));
    expect(result.template.id).toBe('declared-standard');
  });

  it('selects onboarding when isOnboarding is true', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    const result = await handler.execute(baseCommand({ isOnboarding: true }));
    expect(result.template.id).toBe('onboarding');
  });

  it('selects micro when isMicro is true', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    const result = await handler.execute(baseCommand({ isMicro: true }));
    expect(result.template.id).toBe('micro');
  });

  // ── FlowSelected event appended ──

  it('appends FlowSelected event with correct payload', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    const result = await handler.execute(baseCommand({ taskType: 'Learn' }));

    expect(eventAppender.events).toHaveLength(1);
    const event = eventAppender.events[0];
    expect(event.eventType).toBe('FlowSelected');
    expect(event.studentId).toBe('student-1');
    expect(event.topicId).toBe('topic-1');
    expect(event.payload).toMatchObject({
      studentId: 'student-1',
      templateId: 'declared-standard',
      sessionId: 'test-session-uuid',
      selectionContext: {
        hasTaskType: true,
        isOnboarding: false,
        isMicro: false,
        hasTopic: true,
        cohortFlags: {},
      },
    });
    expect(event.payload).toHaveProperty('selectedAt');
  });

  it('includes sessionId in FlowSelected for non-negotiated templates', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    await handler.execute(baseCommand({ taskType: 'Practice' })); // declared-standard
    expect((eventAppender.events[0].payload as Record<string, unknown>).sessionId).toBe('test-session-uuid');
  });

  it('omits sessionId in FlowSelected for negotiated-standard', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    await handler.execute(baseCommand()); // negotiated-standard (no taskType)
    expect((eventAppender.events[0].payload as Record<string, unknown>).sessionId).toBeUndefined();
  });

  it('includes cohortFlags in selectionContext snapshot', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    policyQuery.set('student-1', { dials: { 'ab.feature': true } });
    await handler.execute(baseCommand());
    const selectionContext = (eventAppender.events[0].payload as Record<string, unknown>).selectionContext as Record<string, unknown>;
    expect(selectionContext.cohortFlags).toEqual({ 'ab.feature': true });
  });

  it('derives idempotency key from command', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    await handler.execute(baseCommand({ idempotencyKey: 'cmd-123' }));

    expect(eventAppender.events[0].idempotencyKey).toBe('cmd-123:FlowSelected');
  });

  it('omits idempotency key when command has none', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    await handler.execute(baseCommand());

    expect(eventAppender.events[0].idempotencyKey).toBeUndefined();
  });

  // ── FlowSelectionContext includes aggregates ──

  it('passes aggregates into FlowSelectionContext', async () => {
    aggregatesQuery.set('student-1', {
      sessionsTotal: 42,
      silenceDays: 3,
      pendingChecks: 5,
      openLoops: 2,
    });
    const result = await handler.execute(baseCommand());

    expect(result.ctx.sessionsTotal).toBe(42);
    expect(result.ctx.silenceDays).toBe(3);
    expect(result.ctx.pendingChecks).toBe(5);
    expect(result.ctx.openLoops).toBe(2);
  });

  it('defaults to zero when aggregates are null (new student)', async () => {
    // No aggregates set — returns null
    const result = await handler.execute(baseCommand());

    expect(result.ctx.sessionsTotal).toBe(0);
    expect(result.ctx.silenceDays).toBe(0);
    expect(result.ctx.pendingChecks).toBe(0);
    expect(result.ctx.openLoops).toBe(0);
  });

  // ── Policy integration ──

  it('passes cohort flags from policy', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    policyQuery.set('student-1', { dials: { 'flow.executor.enabled': true } });
    const result = await handler.execute(baseCommand());

    expect(result.ctx.cohortFlags).toEqual({ 'flow.executor.enabled': true });
  });

  it('defaults cohort flags to empty when policy is null', async () => {
    aggregatesQuery.set('student-1', defaultAggregates);
    // No policy set — returns null
    const result = await handler.execute(baseCommand());

    expect(result.ctx.cohortFlags).toEqual({});
  });

  // ── topicId handling ──

  it('sets topicId to null in event when command has no topicId', async () => {
    const result = await handler.execute(baseCommand({ topicId: undefined }));
    expect(eventAppender.events[0].topicId).toBeNull();
    expect(result.ctx.hasTopic).toBe(false);
  });
});
