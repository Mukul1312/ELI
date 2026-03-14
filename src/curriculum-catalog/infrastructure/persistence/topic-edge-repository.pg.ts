import type { CurriculumCatalogDb } from './db-types';
import type { ITopicEdgeRepository } from '../../domain/topic-edge-repository';
import { TopicEdge, TopicEdgeType } from '../../domain/topic-edge';

interface EdgeRow {
  id: string;
  source_topic_id: string;
  target_topic_id: string;
  edge_type: string;
  strength: string | null;
  cross_subject: boolean;
  notes: string | null;
  created_at: Date;
}

function rowToEntity(row: EdgeRow): TopicEdge {
  return TopicEdge.reconstitute({
    id: row.id,
    sourceTopicId: row.source_topic_id,
    targetTopicId: row.target_topic_id,
    edgeType: row.edge_type as TopicEdge['edgeType'],
    strength: row.strength as TopicEdge['strength'],
    crossSubject: row.cross_subject,
    notes: row.notes,
    createdAt: row.created_at,
  });
}

export class PostgresTopicEdgeRepository implements ITopicEdgeRepository {
  constructor(private readonly db: CurriculumCatalogDb) {}

  async save(edge: TopicEdge): Promise<void> {
    const p = edge.toProps();
    await this.db.none(
      `INSERT INTO topic_edges (id, source_topic_id, target_topic_id, edge_type, strength, cross_subject, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (source_topic_id, target_topic_id, edge_type) DO UPDATE SET
         strength = EXCLUDED.strength, cross_subject = EXCLUDED.cross_subject, notes = EXCLUDED.notes`,
      [p.id, p.sourceTopicId, p.targetTopicId, p.edgeType, p.strength, p.crossSubject, p.notes, p.createdAt],
    );
  }

  async findPrerequisites(topicId: string): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT * FROM topic_edges WHERE target_topic_id = $1 AND edge_type = 'prerequisite_of' ORDER BY created_at`,
      [topicId],
    );
    return rows.map(rowToEntity);
  }

  async findUnlocks(topicId: string): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT * FROM topic_edges WHERE source_topic_id = $1 AND edge_type = 'prerequisite_of' ORDER BY created_at`,
      [topicId],
    );
    return rows.map(rowToEntity);
  }

  async findRelated(topicId: string): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT * FROM topic_edges WHERE (source_topic_id = $1 OR target_topic_id = $1) AND edge_type IN ('related_to', 'applied_in') ORDER BY created_at`,
      [topicId],
    );
    return rows.map(rowToEntity);
  }

  async findAll(topicId: string): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT * FROM topic_edges WHERE source_topic_id = $1 OR target_topic_id = $1 ORDER BY edge_type, created_at`,
      [topicId],
    );
    return rows.map(rowToEntity);
  }

  async findCrossSubjectEdges(examId: string): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT te.* FROM topic_edges te JOIN curriculum_topics src ON src.id = te.source_topic_id WHERE te.cross_subject = true AND src.exam_id = $1 ORDER BY te.edge_type, te.created_at`,
      [examId],
    );
    return rows.map(rowToEntity);
  }

  async findByType(edgeType: TopicEdgeType): Promise<TopicEdge[]> {
    const rows = await this.db.manyOrNone<EdgeRow>(
      `SELECT * FROM topic_edges WHERE edge_type = $1 ORDER BY created_at`,
      [edgeType],
    );
    return rows.map(rowToEntity);
  }
}
