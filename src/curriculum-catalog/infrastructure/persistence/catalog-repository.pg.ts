import type { CurriculumCatalogDb } from './db-types';
import type { ICatalogRepository, BrowseFilters, ExamRecord } from '../../domain/catalog-repository';
import { CatalogTopic } from '../../domain/catalog-topic';
import type { CurriculumTreeLevel, CurriculumTreeNode } from '../../domain/value-objects';

const SENTINEL_ID = '00000000-0000-0000-0000-000000000000';

interface TopicRow {
  id: string;
  name: string;
  aliases: string[];
  exam_id: string;
  subject_id: string;
  unit_id: string;
  chapter_id: string;
  provisional: boolean;
  created_at: Date;
  updated_at: Date;
}

interface HierarchyRow {
  id: string;
  name: string;
  child_count: number;
}

function rowToEntity(row: TopicRow): CatalogTopic {
  return CatalogTopic.reconstitute({
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    examId: row.exam_id,
    subjectId: row.subject_id,
    unitId: row.unit_id,
    chapterId: row.chapter_id,
    provisional: row.provisional,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class PostgresCatalogRepository implements ICatalogRepository {
  constructor(private readonly db: CurriculumCatalogDb) {}

  async findTopicById(id: string): Promise<CatalogTopic | null> {
    const row = await this.db.oneOrNone<TopicRow>(
      'SELECT * FROM curriculum_topics WHERE id = $1',
      [id],
    );
    return row ? rowToEntity(row) : null;
  }

  async findTopicByNameAndExam(name: string, examId: string): Promise<CatalogTopic | null> {
    const row = await this.db.oneOrNone<TopicRow>(
      'SELECT * FROM curriculum_topics WHERE LOWER(name) = LOWER($1) AND exam_id = $2',
      [name, examId],
    );
    return row ? rowToEntity(row) : null;
  }

  async findTopicsByAlias(alias: string): Promise<CatalogTopic[]> {
    const rows = await this.db.many<TopicRow>(
      'SELECT * FROM curriculum_topics WHERE $1 = ANY(aliases)',
      [alias.toLowerCase()],
    );
    return rows.map(rowToEntity);
  }

  async saveProvisionalTopic(topic: CatalogTopic): Promise<void> {
    const p = topic.toProps();
    await this.db.none(
      `INSERT INTO curriculum_topics (id, name, aliases, exam_id, subject_id, unit_id, chapter_id, provisional, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.aliases, SENTINEL_ID, SENTINEL_ID, SENTINEL_ID, SENTINEL_ID, p.createdAt, p.updatedAt],
    );
  }

  async saveTopic(topic: CatalogTopic): Promise<void> {
    const p = topic.toProps();
    await this.db.none(
      `INSERT INTO curriculum_topics (id, name, aliases, exam_id, subject_id, unit_id, chapter_id, provisional, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = $2, aliases = $3, exam_id = $4, subject_id = $5, unit_id = $6,
         chapter_id = $7, provisional = $8, updated_at = $10`,
      [p.id, p.name, p.aliases, p.examId, p.subjectId, p.unitId, p.chapterId, p.provisional, p.createdAt, p.updatedAt],
    );
  }

  async saveTopics(topics: CatalogTopic[]): Promise<void> {
    for (const topic of topics) {
      await this.saveTopic(topic);
    }
  }

  async browseByLevel(filters: BrowseFilters): Promise<CurriculumTreeLevel> {
    // Drill down: chapter → topics, unit → chapters, subject → units, exam → subjects, root → exams
    if (filters.chapterId) {
      return this.browseTopicsInChapter(filters.chapterId, filters.instituteId);
    }
    if (filters.unitId) {
      return this.browseChaptersInUnit(filters.unitId);
    }
    if (filters.subjectId) {
      return this.browseUnitsInSubject(filters.subjectId);
    }
    if (filters.examId) {
      return this.browseSubjectsInExam(filters.examId);
    }
    return this.browseExams();
  }

  async listExams(): Promise<ExamRecord[]> {
    return this.db.many<ExamRecord>(
      `SELECT id, name, slug FROM curriculum_exams WHERE id != $1 ORDER BY name`,
      [SENTINEL_ID],
    );
  }

  async findOrCreateHierarchy(
    examId: string,
    subject: string,
    unit: string,
    chapter: string,
  ): Promise<{ subjectId: string; unitId: string; chapterId: string }> {
    // Subject
    const subjectRow = await this.db.one<{ id: string }>(
      `INSERT INTO curriculum_subjects (exam_id, name)
       VALUES ($1, $2)
       ON CONFLICT (exam_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [examId, subject],
    );

    // Unit
    const unitRow = await this.db.one<{ id: string }>(
      `INSERT INTO curriculum_units (subject_id, name)
       VALUES ($1, $2)
       ON CONFLICT (subject_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [subjectRow.id, unit],
    );

    // Chapter
    const chapterRow = await this.db.one<{ id: string }>(
      `INSERT INTO curriculum_chapters (unit_id, name)
       VALUES ($1, $2)
       ON CONFLICT (unit_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [unitRow.id, chapter],
    );

    return { subjectId: subjectRow.id, unitId: unitRow.id, chapterId: chapterRow.id };
  }

  // ── Private browse helpers ───────────────────────────────────────────

  private async browseExams(): Promise<CurriculumTreeLevel> {
    const rows = await this.db.many<HierarchyRow>(
      `SELECT e.id, e.name, COUNT(s.id)::int AS child_count
       FROM curriculum_exams e
       LEFT JOIN curriculum_subjects s ON s.exam_id = e.id AND s.id != $1
       WHERE e.id != $1
       GROUP BY e.id, e.name
       ORDER BY e.name`,
      [SENTINEL_ID],
    );
    return {
      level: 'exam',
      parentId: null,
      nodes: rows.map(r => ({ id: r.id, name: r.name, type: 'exam' as const, childCount: r.child_count })),
    };
  }

  private async browseSubjectsInExam(examId: string): Promise<CurriculumTreeLevel> {
    const rows = await this.db.many<HierarchyRow>(
      `SELECT s.id, s.name, COUNT(u.id)::int AS child_count
       FROM curriculum_subjects s
       LEFT JOIN curriculum_units u ON u.subject_id = s.id AND u.id != $2
       WHERE s.exam_id = $1 AND s.id != $2
       GROUP BY s.id, s.name, s.sort_order
       ORDER BY s.sort_order, s.name`,
      [examId, SENTINEL_ID],
    );
    return {
      level: 'subject',
      parentId: examId,
      nodes: rows.map(r => ({ id: r.id, name: r.name, type: 'subject' as const, childCount: r.child_count })),
    };
  }

  private async browseUnitsInSubject(subjectId: string): Promise<CurriculumTreeLevel> {
    const rows = await this.db.many<HierarchyRow>(
      `SELECT u.id, u.name, COUNT(c.id)::int AS child_count
       FROM curriculum_units u
       LEFT JOIN curriculum_chapters c ON c.unit_id = u.id AND c.id != $2
       WHERE u.subject_id = $1 AND u.id != $2
       GROUP BY u.id, u.name, u.sort_order
       ORDER BY u.sort_order, u.name`,
      [subjectId, SENTINEL_ID],
    );
    return {
      level: 'unit',
      parentId: subjectId,
      nodes: rows.map(r => ({ id: r.id, name: r.name, type: 'unit' as const, childCount: r.child_count })),
    };
  }

  private async browseChaptersInUnit(unitId: string): Promise<CurriculumTreeLevel> {
    const rows = await this.db.many<HierarchyRow>(
      `SELECT c.id, c.name, COUNT(t.id)::int AS child_count
       FROM curriculum_chapters c
       LEFT JOIN curriculum_topics t ON t.chapter_id = c.id
       WHERE c.unit_id = $1 AND c.id != $2
       GROUP BY c.id, c.name, c.sort_order
       ORDER BY c.sort_order, c.name`,
      [unitId, SENTINEL_ID],
    );
    return {
      level: 'chapter',
      parentId: unitId,
      nodes: rows.map(r => ({ id: r.id, name: r.name, type: 'chapter' as const, childCount: r.child_count })),
    };
  }

  private async browseTopicsInChapter(chapterId: string, instituteId?: string): Promise<CurriculumTreeLevel> {
    let query: string;
    let params: unknown[];

    if (instituteId) {
      query = `SELECT t.id, t.name, 0 AS child_count
               FROM curriculum_topics t
               JOIN institute_curriculum ic ON ic.topic_id = t.id AND ic.institute_id = $2
               WHERE t.chapter_id = $1 AND t.provisional = false
               ORDER BY t.name`;
      params = [chapterId, instituteId];
    } else {
      query = `SELECT id, name, 0 AS child_count
               FROM curriculum_topics
               WHERE chapter_id = $1 AND provisional = false
               ORDER BY name`;
      params = [chapterId];
    }

    const rows = await this.db.many<HierarchyRow>(query, params);
    return {
      level: 'topic',
      parentId: chapterId,
      nodes: rows.map(r => ({ id: r.id, name: r.name, type: 'topic' as const, childCount: 0 })),
    };
  }
}
