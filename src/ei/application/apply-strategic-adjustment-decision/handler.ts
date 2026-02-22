import type { IStudentPolicyRepository } from '../../domain/student-policy/repository';
import { StudentPolicy } from '../../domain/student-policy/student-policy';
import { StudentPolicyId } from '../../domain/student-policy/value-objects';
import type { ApplyStrategicAdjustmentDecisionCommand } from './command';
import type { IApplyStrategicAdjustmentDecisionUseCase } from './port';

export class ApplyStrategicAdjustmentDecisionHandler implements IApplyStrategicAdjustmentDecisionUseCase {
  constructor(private readonly repo: IStudentPolicyRepository) {}

  async execute(command: ApplyStrategicAdjustmentDecisionCommand): Promise<void> {
    const id = StudentPolicyId.create(command.studentId);

    const issuedAt =
      command.issuedAt instanceof Date
        ? command.issuedAt
        : command.issuedAt != null
          ? new Date(command.issuedAt)
          : null;
    if (!issuedAt || isNaN(issuedAt.getTime())) {
      throw new Error('issuedAt is required and must be a valid date');
    }

    const dials = command.dials ?? {};
    const constraints = command.constraints ?? {};

    let policy = await this.repo.findById(id);
    if (!policy) {
      policy = StudentPolicy.empty(id);
    }

    policy.applyStrategicAdjustmentDecision({
      tightnessLevel: command.tightnessLevel,
      adjustmentMode: command.adjustmentMode,
      dials,
      constraints,
      issuedAt,
    });

    await this.repo.save(policy);
  }
}
