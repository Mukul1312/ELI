/**
 * Seed script for CurriculumCatalog.
 * Usage: npx tsx src/curriculum-catalog/seed/run-seed.ts
 *
 * Idempotent — deduplicates by (exam slug, topic name).
 * Requires DATABASE_URL and migration to have run first.
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { PostgresStore } from '@mastra/pg';
import { SEED_EXAMS } from './seed-data';
import type { SeedExam, SeedSubject, SeedUnit, SeedChapter, SeedTopic } from './seed-data';

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

  try {
    for (const exam of SEED_EXAMS) {
      // Upsert exam
      const examRow = await db.one<{ id: string }>(
        `INSERT INTO curriculum_exams (id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [randomUUID(), exam.name, exam.slug],
      );
      console.log(`Exam: ${exam.name} (${examRow.id})`);

      for (const subject of exam.subjects) {
        const subjectRow = await db.one<{ id: string }>(
          `INSERT INTO curriculum_subjects (exam_id, name)
           VALUES ($1, $2)
           ON CONFLICT (exam_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [examRow.id, subject.name],
        );

        for (const unit of subject.units) {
          const unitRow = await db.one<{ id: string }>(
            `INSERT INTO curriculum_units (subject_id, name)
             VALUES ($1, $2)
             ON CONFLICT (subject_id, name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [subjectRow.id, unit.name],
          );

          for (const chapter of unit.chapters) {
            const chapterRow = await db.one<{ id: string }>(
              `INSERT INTO curriculum_chapters (unit_id, name)
               VALUES ($1, $2)
               ON CONFLICT (unit_id, name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [unitRow.id, chapter.name],
            );

            for (const topic of chapter.topics) {
              // Check if topic already exists (dedup by name + exam)
              const existing = await db.oneOrNone<{ id: string }>(
                `SELECT id FROM curriculum_topics WHERE LOWER(name) = LOWER($1) AND exam_id = $2`,
                [topic.name, examRow.id],
              );

              if (existing) {
                skipped++;
                continue;
              }

              await db.none(
                `INSERT INTO curriculum_topics (id, name, aliases, exam_id, subject_id, unit_id, chapter_id, provisional)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
                [randomUUID(), topic.name, topic.aliases, examRow.id, subjectRow.id, unitRow.id, chapterRow.id],
              );
              totalTopics++;
            }
          }
        }
      }
    }

    console.log(`\nSeed complete. Created: ${totalTopics} topics. Skipped (dedup): ${skipped}.`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await store.close();
  }
}

seed();
