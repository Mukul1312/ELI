import type { IStudentPolicyRepository } from '../../domain/student-policy/repository';
import { StudentPolicy } from '../../domain/student-policy/student-policy';
import { StudentPolicyId } from '../../domain/student-policy/value-objects';
import type { ApplyStrategicAdjustmentDecisionCommand } from './command';
import type { IApplyStrategicAdjustmentDecisionUseCase } from './port';

export class ApplyStrategicAdjustmentDecisionHandler implements IApplyStrategicAdjustmentDecisionUseCase {
  constructor(private readonly repo: IStudentPolicyRepository) {}

  async execute(command: ApplyStrategicAdjustmentDecisionCommand): Promise<void> {
    const id = StudentPolicyId.create(command.studentId);

    let policy = await this.repo.findById(id);
    if (!policy) {
      policy = StudentPolicy.empty(id);
    }

    policy.applyStrategicAdjustmentDecision({
      tightnessLevel: command.tightnessLevel,
      adjustmentMode: command.adjustmentMode,
      dials: command.dials,
      constraints: command.constraints,
      issuedAt: command.issuedAt,
    });

    await this.repo.save(policy);
  }
}
