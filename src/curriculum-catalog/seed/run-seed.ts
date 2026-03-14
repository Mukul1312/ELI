/**
 * Seed script for CurriculumCatalog.
 * Usage: npx tsx src/curriculum-catalog/seed/run-seed.ts
 *
 * Idempotent — deduplicates by (exam slug, topic name).
 * Requires DATABASE_URL and migration to have run first.
 */

import 'dotenv/config';
import { v5 as uuidv5 } from 'uuid';
import { PostgresStore } from '@mastra/pg';
import { SEED_EXAMS, SEED_EDGES } from './seed-data';
import type { SeedExam, SeedSubject, SeedUnit, SeedChapter, SeedTopic } from './seed-data';

/**
 * Fixed namespace for all curriculum seed UUIDs.
 * NEVER change this — it would change every topic UUID and orphan existing ei_events references.
 */
const SEED_NAMESPACE = '7b4e5c1a-3f2d-4a8b-9e0c-1d2f3a4b5c6d';

function seedId(...parts: string[]): string {
  return uuidv5(parts.join('::'), SEED_NAMESPACE);
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const store = new PostgresStore({ id: 'cc-seed', connectionString });
  const db = store.db;

  let totalTopics = 0;
  let skipped = 0;
  // Maps "LOWER(name)" → topicId for edge resolution after seeding
  const topicIdByLowerName = new Map<string, string>();

  try {
    for (const exam of SEED_EXAMS) {
      // Upsert exam
      const examRow = await db.one<{ id: string }>(
        `INSERT INTO curriculum_exams (id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [seedId(exam.slug), exam.name, exam.slug],
      );
      console.log(`Exam: ${exam.name} (${examRow.id})`);

      for (const subject of exam.subjects) {
        const subjectRow = await db.one<{ id: string }>(
          `INSERT INTO curriculum_subjects (id, exam_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (exam_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [seedId(exam.slug, subject.name), examRow.id, subject.name],
        );

        for (const unit of subject.units) {
          const unitRow = await db.one<{ id: string }>(
            `INSERT INTO curriculum_units (id, subject_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (subject_id, name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [seedId(exam.slug, subject.name, unit.name), subjectRow.id, unit.name],
          );

          for (const chapter of unit.chapters) {
            const chapterRow = await db.one<{ id: string }>(
              `INSERT INTO curriculum_chapters (id, unit_id, name)
               VALUES ($1, $2, $3)
               ON CONFLICT (unit_id, name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [seedId(exam.slug, subject.name, unit.name, chapter.name), unitRow.id, chapter.name],
            );

            for (const topic of chapter.topics) {
              // Check if topic already exists (dedup by name + exam)
              const existing = await db.oneOrNone<{ id: string }>(
                `SELECT id FROM curriculum_topics WHERE LOWER(name) = LOWER($1) AND exam_id = $2`,
                [topic.name, examRow.id],
              );

              if (existing) {
                skipped++;
                topicIdByLowerName.set(topic.name.toLowerCase(), existing.id);
                continue;
              }

              const newTopicId = seedId(exam.slug, subject.name, unit.name, chapter.name, topic.name);
              await db.none(
                `INSERT INTO curriculum_topics (id, name, aliases, exam_id, subject_id, unit_id, chapter_id, provisional)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
                [newTopicId, topic.name, topic.aliases, examRow.id, subjectRow.id, unitRow.id, chapterRow.id],
              );
              topicIdByLowerName.set(topic.name.toLowerCase(), newTopicId);
              totalTopics++;
            }
          }
        }
      }
    }

    console.log(`\nTopics done. Created: ${totalTopics}, Skipped (dedup): ${skipped}.`);

    // Seed topic edges
    let totalEdges = 0;
    let skippedEdges = 0;
    let missingTopics = 0;

    for (const edge of SEED_EDGES) {
      const sourceId = topicIdByLowerName.get(edge.sourceTopic.toLowerCase());
      const targetId = topicIdByLowerName.get(edge.targetTopic.toLowerCase());

      if (!sourceId || !targetId) {
        console.warn(
          `  SKIP edge: "${edge.sourceTopic}" → "${edge.targetTopic}" — ` +
          `${!sourceId ? 'source' : 'target'} topic not found`,
        );
        missingTopics++;
        continue;
      }

      const result = await db.oneOrNone<{ id: string }>(
        `INSERT INTO topic_edges (id, source_topic_id, target_topic_id, edge_type, strength, cross_subject, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (source_topic_id, target_topic_id, edge_type) DO NOTHING
         RETURNING id`,
        [
          seedId('edge', edge.sourceTopic, edge.targetTopic, edge.edgeType),
          sourceId,
          targetId,
          edge.edgeType,
          edge.strength ?? null,
          edge.crossSubject ?? false,
          edge.notes ?? null,
        ],
      );

      if (result) {
        totalEdges++;
      } else {
        skippedEdges++;
      }
    }

    console.log(
      `Edges done. Created: ${totalEdges}, Skipped (dedup): ${skippedEdges}, Missing topics: ${missingTopics}.`,
    );
    console.log('\nSeed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await store.close();
  }
}

seed();
