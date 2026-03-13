/**
 * FlowExecutor — application layer unit tests with in-memory fakes.
 *
 * Per tactical spec §13: "Application layer: unit, in-memory fakes — never mock domain."
 * Per ADR-005 §C10: P1 issuedAt → P2 setAt (fixed mapping).
 * Per ADR-005 §C8: onboarding includes silent P2.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowExecutor } from '../application/execute-flow/handler';
import { FlowTemplate } from '../domain/value-objects/flow-template';
import type { ExecuteFlowCommand } from '../application/execute-flow/port';
import type { IRunDeclaredIntentUseCase } from '../../application/run-declared-intent/port';
import type { IRunP1GateUseCase } from '../../application/run-p1-gate/port';
import type { IRunP2GateUseCase } from '../../application/run-p2-gate/port';
import type { SessionIntentIssuedOutput, ActivationPlanIssuedOutput } from '../../schemas/outputs';

// ── In-memory fakes ──

function makeIntentOutput(overrides: Partial<SessionIntentIssuedOutput> = {}): SessionIntentIssuedOutput {
  return {
    studentId: 'student-1',
    topicId: 'topic-1',
    intentSource: 'declared',
    timebox: 30,
    taskType: 'Practice',
    energy: 3,
    sleepBucket: '7-8',
    issuedAt: '2026-03-13T10:00:00.000Z',
    mode: null,
    playId: null,
    verificationFloor: null,
    constraints: null,
    stateScore: null,
    questionCount: null,
    difficultyTier: null,
    sessionIntentId: null,
    ...overrides,
  };
}

function makeP2Output(overrides: Partial<ActivationPlanIssuedOutput> = {}): ActivationPlanIssuedOutput {
  return {
    studentId: 'student-1',
    mode: 'Neutral',
    playId: 'play-1',
    firstAction: { type: 'standard' },
    issuedAt: '2026-03-13T10:00:01.000Z',
    ...overrides,
  };
}

class FakeDeclaredIntentHandler implements IRunDeclaredIntentUseCase {
  calls: unknown[] = [];
  private output: SessionIntentIssuedOutput;

  constructor(output?: SessionIntentIssuedOutput) {
    this.output = output ?? makeIntentOutput();
  }

  async execute(command: unknown): Promise<SessionIntentIssuedOutput> {
    this.calls.push(command);
    return this.output;
  }
}

class FakeP1Handler implements IRunP1GateUseCase {
  calls: unknown[] = [];
  private output: SessionIntentIssuedOutput;

  constructor(output?: SessionIntentIssuedOutput) {
    this.output = output ?? makeIntentOutput({ intentSource: 'negotiated', mode: 'Neutral' });
  }

  async execute(command: unknown): Promise<SessionIntentIssuedOutput> {
    this.calls.push(command);
    return this.output;
  }
}

class FakeP2Handler implements IRunP2GateUseCase {
  calls: unknown[] = [];
  private output: ActivationPlanIssuedOutput;

  constructor(output?: ActivationPlanIssuedOutput) {
    this.output = output ?? makeP2Output();
  }

  async execute(command: unknown): Promise<ActivationPlanIssuedOutput> {
    this.calls.push(command);
    return this.output;
  }
}

// ── Tests ──

describe('FlowExecutor', () => {
  let declaredHandler: FakeDeclaredIntentHandler;
  let p1Handler: FakeP1Handler;
  let p2Handler: FakeP2Handler;
  let executor: FlowExecutor;

  const baseCommand: ExecuteFlowCommand = {
    studentId: 'student-1',
    topicId: 'topic-1',
    sessionId: 'session-1',
    timebox: 25,
    taskType: 'Learn',
    energy: 4,
    sleepBucket: '7-8',
  };

  beforeEach(() => {
    declaredHandler = new FakeDeclaredIntentHandler();
    p1Handler = new FakeP1Handler();
    p2Handler = new FakeP2Handler();
    executor = new FlowExecutor(declaredHandler, p1Handler, p2Handler);
  });

  // ── declared-standard ──

  describe('declared-standard template', () => {
    const template = FlowTemplate.declaredStandard();

    it('runs silent P1 then silent P2 and returns declared result', async () => {
      const result = await executor.execute(template, baseCommand);

      expect(result.kind).toBe('declared');
      expect(declaredHandler.calls).toHaveLength(1);
      expect(p2Handler.calls).toHaveLength(1);
      expect(p1Handler.calls).toHaveLength(0);
    });

    it('threads P1 issuedAt → P2 setAt (ADR-005 §C10)', async () => {
      const issuedAt = '2026-03-13T12:00:00.000Z';
      declaredHandler = new FakeDeclaredIntentHandler(makeIntentOutput({ issuedAt }));
      executor = new FlowExecutor(declaredHandler, p1Handler, p2Handler);

      await executor.execute(template, baseCommand);

      const p2Call = p2Handler.calls[0] as { setAt: string };
      expect(p2Call.setAt).toBe(issuedAt);
    });

    it('passes command fields to declared intent handler', async () => {
      await executor.execute(template, baseCommand);

      const call = declaredHandler.calls[0] as Record<string, unknown>;
      expect(call.studentId).toBe('student-1');
      expect(call.topicId).toBe('topic-1');
      expect(call.sessionId).toBe('session-1');
      expect(call.timebox).toBe(25);
      expect(call.taskType).toBe('Learn');
      expect(call.energy).toBe(4);
    });

    it('returns both p2Output and intentOutput', async () => {
      const result = await executor.execute(template, baseCommand);
      if (result.kind !== 'declared') throw new Error('expected declared');

      expect(result.p2Output).toBeDefined();
      expect(result.intentOutput).toBeDefined();
      expect(result.intentOutput.issuedAt).toBe('2026-03-13T10:00:00.000Z');
    });

    it('defaults timebox to 30 when not provided', async () => {
      const { timebox: _, ...cmdNoTimebox } = baseCommand;
      await executor.execute(template, cmdNoTimebox as ExecuteFlowCommand);

      const call = declaredHandler.calls[0] as Record<string, unknown>;
      expect(call.timebox).toBe(30);
    });
  });

  // ── onboarding ──

  describe('onboarding template', () => {
    const template = FlowTemplate.onboarding();

    it('runs silent P1 then silent P2 (ADR-005 §C8 fix)', async () => {
      const result = await executor.execute(template, baseCommand);

      expect(result.kind).toBe('onboarding');
      expect(declaredHandler.calls).toHaveLength(1);
      expect(p2Handler.calls).toHaveLength(1);
      expect(p1Handler.calls).toHaveLength(0);
    });

    it('threads P1 issuedAt → P2 setAt same as declared', async () => {
      const issuedAt = '2026-03-13T14:00:00.000Z';
      declaredHandler = new FakeDeclaredIntentHandler(makeIntentOutput({ issuedAt }));
      executor = new FlowExecutor(declaredHandler, p1Handler, p2Handler);

      await executor.execute(template, baseCommand);

      const p2Call = p2Handler.calls[0] as { setAt: string };
      expect(p2Call.setAt).toBe(issuedAt);
    });

    it('returns onboarding kind with p2Output and intentOutput', async () => {
      const result = await executor.execute(template, baseCommand);
      if (result.kind !== 'onboarding') throw new Error('expected onboarding');

      expect(result.p2Output.mode).toBe('Neutral');
      expect(result.intentOutput.studentId).toBe('student-1');
    });
  });

  // ── negotiated-standard ──

  describe('negotiated-standard template', () => {
    const template = FlowTemplate.negotiatedStandard();

    it('runs P1 only (P2 triggered later by CommandRouter)', async () => {
      const result = await executor.execute(template, baseCommand);

      expect(result.kind).toBe('negotiated');
      expect(p1Handler.calls).toHaveLength(1);
      expect(declaredHandler.calls).toHaveLength(0);
      expect(p2Handler.calls).toHaveLength(0);
    });

    it('passes studentId, topicId, sessionId, energy to P1', async () => {
      await executor.execute(template, baseCommand);

      const call = p1Handler.calls[0] as Record<string, unknown>;
      expect(call.studentId).toBe('student-1');
      expect(call.topicId).toBe('topic-1');
      expect(call.sessionId).toBe('session-1');
      expect(call.energy).toBe(4);
    });

    it('returns negotiated kind with p1Output', async () => {
      const result = await executor.execute(template, baseCommand);
      if (result.kind !== 'negotiated') throw new Error('expected negotiated');

      expect(result.p1Output).toBeDefined();
      expect(result.p1Output.intentSource).toBe('negotiated');
    });
  });

  // ── micro ──

  describe('micro template', () => {
    const template = FlowTemplate.micro();

    it('runs P2 only, skips P1 entirely (canvas Q1)', async () => {
      const result = await executor.execute(template, baseCommand);

      expect(result.kind).toBe('micro');
      expect(p2Handler.calls).toHaveLength(1);
      expect(declaredHandler.calls).toHaveLength(0);
      expect(p1Handler.calls).toHaveLength(0);
    });

    it('passes taskType micro to P2', async () => {
      await executor.execute(template, baseCommand);

      const call = p2Handler.calls[0] as Record<string, unknown>;
      expect(call.taskType).toBe('micro');
    });

    it('returns micro kind with p2Output', async () => {
      const result = await executor.execute(template, baseCommand);
      if (result.kind !== 'micro') throw new Error('expected micro');

      expect(result.p2Output.mode).toBe('Neutral');
    });
  });

  // ── error case ──

  it('throws for unknown template id', async () => {
    // Create a template-like object with an unknown id
    const unknownTemplate = { id: 'unknown', phases: [] } as unknown as FlowTemplate;

    await expect(executor.execute(unknownTemplate, baseCommand)).rejects.toThrow(
      "FlowExecutor: unknown template 'unknown'",
    );
  });
});
