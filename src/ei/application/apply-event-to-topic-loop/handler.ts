import type { ITopicLoopRepository } from '../../domain/topic-loop/repository';
import { TopicLoop } from '../../domain/topic-loop/topic-loop';
import { TopicLoopId } from '../../domain/topic-loop/value-objects';
import type { ApplyEventCommand } from './command';
import type { IApplyEventToTopicLoopUseCase } from './port';

export class ApplyEventToTopicLoopHandler implements IApplyEventToTopicLoopUseCase {
  constructor(private readonly repo: ITopicLoopRepository) {}

  async execute(command: ApplyEventCommand): Promise<void> {
    const { studentId, topicId, eventType, payload } = command;
    const id = TopicLoopId.create(studentId, topicId);

    let topicLoop = await this.repo.findById(id);
    if (!topicLoop) {
      topicLoop = TopicLoop.empty(id);
    }

    topicLoop.applyEvent(eventType, payload);
    await this.repo.save(topicLoop);
  }
}
