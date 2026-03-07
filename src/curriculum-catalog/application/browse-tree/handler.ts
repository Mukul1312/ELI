import type { IBrowseTreeUseCase, BrowseTreeCommand } from './port';
import type { ICatalogRepository } from '../../domain/catalog-repository';
import type { CurriculumTreeLevel } from '../../domain/value-objects';

export class BrowseTreeHandler implements IBrowseTreeUseCase {
  constructor(private readonly catalogRepo: ICatalogRepository) {}

  async execute(command: BrowseTreeCommand): Promise<CurriculumTreeLevel> {
    return this.catalogRepo.browseByLevel({
      examId: command.examId,
      subjectId: command.subjectId,
      unitId: command.unitId,
      chapterId: command.chapterId,
      instituteId: command.instituteId,
    });
  }
}
