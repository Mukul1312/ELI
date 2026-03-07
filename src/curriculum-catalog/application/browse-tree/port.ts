import type { BrowseTreeCommand } from './command';
import type { CurriculumTreeLevel } from '../../domain/value-objects';

export type { BrowseTreeCommand };

export interface IBrowseTreeUseCase {
  execute(command: BrowseTreeCommand): Promise<CurriculumTreeLevel>;
}
