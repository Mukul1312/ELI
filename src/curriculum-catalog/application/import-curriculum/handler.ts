import { randomUUID } from 'crypto';
import type { IImportCurriculumUseCase, ImportCurriculumCommand } from './port';
import type { ICatalogRepository } from '../../domain/catalog-repository';
import type { ImportResult } from '../../domain/value-objects';
import { CatalogTopic } from '../../domain/catalog-topic';

export class ImportCurriculumHandler implements IImportCurriculumUseCase {
  constructor(private readonly catalogRepo: ICatalogRepository) {}

  async execute(command: ImportCurriculumCommand): Promise<ImportResult> {
    let created = 0;
    let deduplicated = 0;
    const errors: string[] = [];

    for (const row of command.rows) {
      try {
        // Find or create hierarchy
        const hierarchy = await this.catalogRepo.findOrCreateHierarchy(
          command.examId,
          row.subject,
          row.unit,
          row.chapter,
        );

        // Check for duplicate
        const existing = await this.catalogRepo.findTopicByNameAndExam(row.topic, command.examId);
        if (existing) {
          deduplicated++;
          // Add any new aliases
          if (row.aliases) {
            for (const alias of row.aliases) {
              existing.addAlias(alias);
            }
            await this.catalogRepo.saveTopic(existing);
          }
          continue;
        }

        // Create new topic
        const topic = CatalogTopic.create({
          id: randomUUID(),
          name: row.topic,
          aliases: (row.aliases ?? []).map(a => a.trim().toLowerCase()),
          examId: command.examId,
          subjectId: hierarchy.subjectId,
          unitId: hierarchy.unitId,
          chapterId: hierarchy.chapterId,
          provisional: false,
        });

        await this.catalogRepo.saveTopic(topic);
        created++;
      } catch (err) {
        errors.push(`Row "${row.topic}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { created, deduplicated, errors };
  }
}
