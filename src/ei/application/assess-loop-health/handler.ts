import type { IGetStudentSignalsPort } from './port';
import type { IAssessLoopHealthUseCase } from './port';
import type { AssessLoopHealthCommand } from './command';
import type { IClock } from '../shared/port-clock';
import { assessLoopHealth } from '../../domain/loop-health/assess-loop-health';
import { MissingAggregatesError, InvalidGateContextError } from './errors';

function isP1Context(ctx: AssessLoopHealthCommand['gateContext']): ctx is import('../../domain/loop-health/gate-context').P1Context {
  return 'energy' in ctx && 'sleepBucket' in ctx;
}
function isP2Context(ctx: AssessLoopHealthCommand['gateContext']): ctx is import('../../domain/loop-health/gate-context').P2Context {
  return 'replanCount' in ctx && typeof ctx.replanCount === 'number';
}
function isP3Context(ctx: AssessLoopHealthCommand['gateContext']): ctx is import('../../domain/loop-health/gate-context').P3Context {
  return 'hasRetrieval' in ctx && 'hasSchedule' in ctx;
}

export class AssessLoopHealthHandler implements IAssessLoopHealthUseCase {
  constructor(
    private readonly getSignalsPort: IGetStudentSignalsPort,
    private readonly clock: IClock
  ) {}

  async execute(command: AssessLoopHealthCommand): Promise<import('../../domain/loop-health/loop-health-snapshot').LoopHealthSnapshot> {
    const { studentId, gatePhase, gateContext } = command;

    if (!studentId || typeof studentId !== 'string') {
      throw new Error('studentId is required');
    }

    if (!gateContext) {
      throw new Error('gateContext is required');
    }

    if (!isP1Context(gateContext) && !isP2Context(gateContext) && !isP3Context(gateContext)) {
      throw new InvalidGateContextError('gateContext must be P1Context, P2Context, or P3Context');
    }

    let aggregates = command.aggregates;
    let policy = command.policy;

    if (!aggregates) {
      const signals = await this.getSignalsPort.getSignals(studentId);
      if (!signals) {
        throw new MissingAggregatesError(studentId);
      }
      aggregates = signals.aggregates;
      policy = policy ?? signals.policy;
    }

    const now = this.clock.now();
    const computedAt = now.toISOString();

    return assessLoopHealth(
      studentId,
      aggregates,
      gateContext,
      policy,
      gatePhase,
      computedAt
    );
  }
}
