import type { ImportCurriculumCommand } from './command';
import type { ImportResult } from '../../domain/value-objects';

export type { ImportCurriculumCommand };

export interface IImportCurriculumUseCase {
  execute(command: ImportCurriculumCommand): Promise<ImportResult>;
}
