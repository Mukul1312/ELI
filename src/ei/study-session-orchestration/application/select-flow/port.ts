/**
 * ISelectFlowUseCase — driver port for flow selection.
 *
 * Per tactical spec §8: driver port in {use-case}/port.ts, named I{Action}UseCase.
 * Per canvas R1.1: SelectFlow use case.
 */

import type { FlowTemplate } from '../../domain/value-objects/flow-template';
import type { FlowSelectionContext } from '../../domain/value-objects/flow-selection-context';
import type { SelectFlowCommand } from './command';

export interface SelectFlowResult {
  readonly template: FlowTemplate;
  readonly ctx: FlowSelectionContext;
}

export interface ISelectFlowUseCase {
  execute(command: SelectFlowCommand): Promise<SelectFlowResult>;
}
