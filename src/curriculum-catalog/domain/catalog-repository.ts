import type { CatalogTopic } from './catalog-topic';
import type { CurriculumTreeLevel } from './value-objects';

export interface BrowseFilters {
  examId?: string;
  subjectId?: string;
  unitId?: string;
  chapterId?: string;
  instituteId?: string;
}

export interface ExamRecord {
  id: string;
  name: string;
  slug: string;
}

export interface ICatalogRepository {
  findTopicById(id: string): Promise<CatalogTopic | null>;
  findTopicByNameAndExam(name: string, examId: string): Promise<CatalogTopic | null>;
  findTopicsByAlias(alias: string): Promise<CatalogTopic[]>;
  findTopicsByIds(ids: string[]): Promise<CatalogTopic[]>;
  saveProvisionalTopic(topic: CatalogTopic): Promise<void>;
  saveTopic(topic: CatalogTopic): Promise<void>;
  saveTopics(topics: CatalogTopic[]): Promise<void>;
  browseByLevel(filters: BrowseFilters): Promise<CurriculumTreeLevel>;
  listExams(): Promise<ExamRecord[]>;
  findOrCreateHierarchy(examId: string, subject: string, unit: string, chapter: string): Promise<{
    subjectId: string;
    unitId: string;
    chapterId: string;
  }>;
}
