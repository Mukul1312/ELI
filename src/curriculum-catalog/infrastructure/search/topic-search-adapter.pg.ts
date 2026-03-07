import type { CurriculumCatalogDb } from '../persistence/db-types';
import type { ITopicSearchAdapter } from '../../domain/topic-search-service';
import type { SearchResult, MatchType } from '../../domain/value-objects';

interface SearchRow {
  topic_id: string;
  topic_name: string;
  exam_name: string;
  match_type: MatchType;
  is_institute: boolean;
}

/**
 * 4-tier ranked search using pg_trgm.
 * Tier 1: exact name (ILIKE)
 * Tier 2: alias match (ANY)
 * Tier 3: institute-priority trigram
 * Tier 4: global trigram
 *
 * Uses DISTINCT ON to deduplicate across tiers.
 */
export class PostgresTopicSearchAdapter implements ITopicSearchAdapter {
  constructor(private readonly db: CurriculumCatalogDb) {}

  async search(query: string, instituteId: string | null, limit: number): Promise<SearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];

    const likePattern = `%${normalized}%`;

    const sql = `
      WITH ranked AS (
        -- Tier 1: Exact name match
        SELECT ct.id AS topic_id, ct.name AS topic_name, ce.name AS exam_name,
               'exact_name' AS match_type, 1 AS rank,
               CASE WHEN ic.id IS NOT NULL THEN true ELSE false END AS is_institute
        FROM curriculum_topics ct
        JOIN curriculum_exams ce ON ce.id = ct.exam_id
        LEFT JOIN institute_curriculum ic ON ic.topic_id = ct.id AND ic.institute_id = $2
        WHERE LOWER(ct.name) = $1 AND ct.provisional = false

        UNION ALL

        -- Tier 2: Alias match
        SELECT ct.id, ct.name, ce.name,
               'alias', 2,
               CASE WHEN ic.id IS NOT NULL THEN true ELSE false END
        FROM curriculum_topics ct
        JOIN curriculum_exams ce ON ce.id = ct.exam_id
        LEFT JOIN institute_curriculum ic ON ic.topic_id = ct.id AND ic.institute_id = $2
        WHERE $1 = ANY(ct.aliases) AND ct.provisional = false

        UNION ALL

        -- Tier 3: Trigram / LIKE match (institute topics first)
        SELECT ct.id, ct.name, ce.name,
               'fuzzy', CASE WHEN ic.id IS NOT NULL THEN 3 ELSE 4 END,
               CASE WHEN ic.id IS NOT NULL THEN true ELSE false END
        FROM curriculum_topics ct
        JOIN curriculum_exams ce ON ce.id = ct.exam_id
        LEFT JOIN institute_curriculum ic ON ic.topic_id = ct.id AND ic.institute_id = $2
        WHERE LOWER(ct.name) LIKE $3 AND ct.provisional = false
      )
      SELECT DISTINCT ON (topic_id) topic_id, topic_name, exam_name,
             match_type, is_institute
      FROM ranked
      ORDER BY topic_id, rank ASC
      LIMIT $4
    `;

    // Re-sort by rank after dedup
    const wrapSql = `
      SELECT * FROM (${sql}) deduped
      ORDER BY
        CASE match_type WHEN 'exact_name' THEN 1 WHEN 'alias' THEN 2 ELSE 3 END,
        CASE WHEN is_institute THEN 0 ELSE 1 END,
        topic_name
    `;

    const rows = await this.db.many<SearchRow>(wrapSql, [normalized, instituteId, likePattern, limit]);

    return rows.map(r => ({
      topicId: r.topic_id,
      topicName: r.topic_name,
      examName: r.exam_name,
      matchType: r.match_type,
      isInstituteCurriculum: r.is_institute,
    }));
  }
}
