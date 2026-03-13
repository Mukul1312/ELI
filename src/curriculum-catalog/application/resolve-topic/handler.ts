import { randomUUID } from 'crypto';
import type { IResolveTopicUseCase, ResolveTopicCommand } from './port';
import type { ICatalogRepository } from '../../domain/catalog-repository';
import type { ITopicSearchAdapter } from '../../domain/topic-search-service';
import type { INormalizationQueueRepository } from '../../domain/normalization-queue-repository';
import { TopicReference } from '../../domain/value-objects';
import { CatalogTopic } from '../../domain/catalog-topic';
import { NormalizationQueueEntry } from '../../domain/normalization-queue-entry';

const SENTINEL_ID = '00000000-0000-0000-0000-000000000000';

export class ResolveTopicHandler implements IResolveTopicUseCase {
  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly searchAdapter: ITopicSearchAdapter,
    private readonly normalizationRepo: INormalizationQueueRepository,
  ) {}

  async execute(command: ResolveTopicCommand): Promise<TopicReference> {
    const normalized = command.rawText.trim().toLowerCase();

    // 1. Try exact alias match
    const aliasMatches = await this.catalogRepo.findTopicsByAlias(normalized);
    if (aliasMatches.length > 0) {
      return aliasMatches[0].toTopicReference();
    }

    // 2. Try fuzzy search — top result
    const searchResults = await this.searchAdapter.search(
      command.rawText,
      command.instituteId ?? null,
      1,
    );
    if (searchResults.length > 0 && searchResults[0].matchType !== 'provisional') {
      return TopicReference.create(searchResults[0].topicId, searchResults[0].topicName);
    }

    // 3. Free-text fallback: persist provisional + queue
    const topicId = randomUUID();
    const displayName = this.toTitleCase(command.rawText.trim());

    const provisionalTopic = CatalogTopic.create({
      id: topicId,
      name: displayName,
      aliases: [normalized],
      examId: SENTINEL_ID,
      subjectId: SENTINEL_ID,
      unitId: SENTINEL_ID,
      chapterId: SENTINEL_ID,
      provisional: true,
    });

    await this.catalogRepo.saveProvisionalTopic(provisionalTopic);

    const queueEntry = NormalizationQueueEntry.create(
      randomUUID(),
      command.rawText.trim(),
      command.studentId,
    );
    await this.normalizationRepo.append(queueEntry);

    return TopicReference.create(topicId, displayName);
  }

  private toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
}
