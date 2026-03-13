/**
 * backfillTopicNamesTool — repairs NULL topic_name in ei_topic_state.
 *
 * Three-pass strategy:
 *   Pass 1 (Ledger replay): recomputeTopicLoop replays all events for each topic
 *          and extracts topicName from event payloads (most-recent wins).
 *   Pass 2 (Curriculum catalog): for topics still NULL after replay, first tries
 *          direct UUID lookup in curriculum_topics, then fuzzy search via
 *          ResolveTopicHandler.
 *   Pass 3 (Title-case fallback): for any remaining NULLs, derives a display
 *          name by title-casing the topicId (same as getTopicDisplayName).
 *
 * Idempotent: safe to re-run. Existing non-NULL names are never overwritten.
 * Auditable: emits structured JSON logs with correlationId per topic.
 *
 * Ordering: This tool only touches ei_topic_state.topic_name; it does NOT
 * recompute aggregates. If you need a full-student recompute, run
 * recomputeTopicLoopTool + computeAggregatesTool afterward.
 *
 * @see docs/engineering-ddd-design/tactical/ops-observability-tactical-spec.md §7, §8
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { recomputeTopicLoop } from '../../ei/infrastructure/projector/topic-loop-projector';
import { eiStore } from '../../ei/runtime/db';
import * as Q from '../../ei/db/queries';
import { getTopicDisplayName } from '../../ei/study-session-orchestration/domain/services/topic-display-name';
import { createResolveTopicUseCase } from '../../lib/curriculum-catalog';
import { createCorrelationId, logBackfillAudit } from '../../ei/infrastructure/logging';

export const backfillTopicNamesTool = createTool({
  id: 'backfill-topic-names',
  description:
    'Repair NULL topic_name in ei_topic_state via ledger replay, curriculum catalog, and title-case fallback. Idempotent.',
  inputSchema: z.object({
    studentId: z.string().optional().describe('Scope to a single student. Omit for all students.'),
    dryRun: z.boolean().default(false).describe('Preview changes without writing.'),
    skipCatalogLookup: z.boolean().default(false).describe('Skip curriculum catalog resolution (pass 2).'),
  }),
  outputSchema: z.object({
    correlationId: z.string(),
    totalTopics: z.number(),
    alreadyNamed: z.number(),
    fixedByReplay: z.number(),
    fixedByCatalog: z.number(),
    fixedByFallback: z.number(),
    stillNull: z.number(),
    details: z.array(z.object({
      studentId: z.string(),
      topicId: z.string(),
      source: z.enum(['replay', 'catalog', 'fallback', 'skipped']),
      topicName: z.string().nullable(),
    })),
  }),
  execute: async (input) => {
    const correlationId = createCorrelationId();
    const db = eiStore.db;
    const { dryRun, skipCatalogLookup } = input;

    // ── Discover topics with NULL topic_name ──
    const query = input.studentId
      ? 'SELECT student_id, topic_id, topic_name FROM ei_topic_state WHERE student_id = $1 ORDER BY updated_at DESC'
      : 'SELECT student_id, topic_id, topic_name FROM ei_topic_state ORDER BY student_id, updated_at DESC';
    const params = input.studentId ? [input.studentId] : [];
    const allTopics = await db.any<{ student_id: string; topic_id: string; topic_name: string | null }>(query, params);

    const alreadyNamed = allTopics.filter(t => t.topic_name != null).length;
    const nullTopics = allTopics.filter(t => t.topic_name == null);

    const details: Array<{
      studentId: string;
      topicId: string;
      source: 'replay' | 'catalog' | 'fallback' | 'skipped';
      topicName: string | null;
    }> = [];
    let fixedByReplay = 0;
    let fixedByCatalog = 0;
    let fixedByFallback = 0;

    // ── Pass 1: Ledger replay ──
    for (const topic of nullTopics) {
      if (!dryRun) {
        await recomputeTopicLoop(db, topic.student_id, topic.topic_id);
      }

      // Check if recompute populated topic_name
      const nameAfterReplay = dryRun
        ? null
        : await Q.getTopicName(db, topic.student_id, topic.topic_id);

      if (nameAfterReplay != null) {
        fixedByReplay++;
        details.push({
          studentId: topic.student_id,
          topicId: topic.topic_id,
          source: 'replay',
          topicName: nameAfterReplay,
        });

        logBackfillAudit({
          correlationId,
          projectionName: 'TopicLoop.topic_name',
          studentId: topic.student_id,
          topicId: topic.topic_id,
          completedAt: new Date().toISOString(),
        });
      }
    }

    // ── Pass 2: Curriculum catalog lookup ──
    const stillNullAfterReplay = nullTopics.filter(
      t => !details.some(d => d.studentId === t.student_id && d.topicId === t.topic_id),
    );

    if (!skipCatalogLookup) {
      const resolveTopic = createResolveTopicUseCase(db);

      for (const topic of stillNullAfterReplay) {
        let resolved: string | null = null;

        // 2a: Direct UUID lookup in curriculum_topics (handles topicId = catalog UUID)
        try {
          const catalogRow = await db.oneOrNone<{ name: string }>(
            'SELECT name FROM curriculum_topics WHERE id = $1',
            [topic.topic_id],
          );
          if (catalogRow?.name) {
            resolved = catalogRow.name;
          }
        } catch {
          // Not a valid UUID or table doesn't exist — skip to fuzzy
        }

        // 2b: Fuzzy resolve via ResolveTopicHandler (handles human-readable topicIds)
        if (!resolved) {
          try {
            const ref = await resolveTopic.execute({
              rawText: topic.topic_id,
              studentId: topic.student_id,
            });
            if (ref.topicName && ref.topicName !== topic.topic_id) {
              resolved = ref.topicName;
            }
          } catch {
            // Catalog lookup failed — will fall through to pass 3
          }
        }

        if (resolved) {
          if (!dryRun) {
            await Q.upsertTopicState(db, topic.student_id, topic.topic_id, {
              topic_name: resolved,
            });
          }
          fixedByCatalog++;
          details.push({
            studentId: topic.student_id,
            topicId: topic.topic_id,
            source: 'catalog',
            topicName: resolved,
          });
        }
      }
    }

    // ── Pass 3: Title-case fallback ──
    const stillNullAfterCatalog = nullTopics.filter(
      t => !details.some(d => d.studentId === t.student_id && d.topicId === t.topic_id),
    );

    for (const topic of stillNullAfterCatalog) {
      const fallbackName = getTopicDisplayName(topic.topic_id);
      if (!dryRun) {
        await Q.upsertTopicState(db, topic.student_id, topic.topic_id, {
          topic_name: fallbackName,
        });
      }
      fixedByFallback++;
      details.push({
        studentId: topic.student_id,
        topicId: topic.topic_id,
        source: 'fallback',
        topicName: fallbackName,
      });
    }

    const stillNull = dryRun ? stillNullAfterCatalog.length : 0;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'backfill_topic_names_summary',
      correlationId,
      dryRun,
      totalTopics: allTopics.length,
      alreadyNamed,
      fixedByReplay,
      fixedByCatalog,
      fixedByFallback,
      stillNull,
    }));

    return {
      correlationId,
      totalTopics: allTopics.length,
      alreadyNamed,
      fixedByReplay,
      fixedByCatalog,
      fixedByFallback,
      stillNull,
      details,
    };
  },
});
