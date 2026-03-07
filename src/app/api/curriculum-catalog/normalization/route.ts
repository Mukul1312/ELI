import { createResolveNormalizationEntryUseCase } from '@/lib/curriculum-catalog';
import { PostgresNormalizationQueueRepository } from '@/curriculum-catalog/infrastructure/persistence/normalization-queue-repository.pg';
import { eiStore } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = eiStore.db;
  const repo = new PostgresNormalizationQueueRepository(db);
  const entries = await repo.listPending(50);

  return Response.json({
    entries: entries.map(e => e.toProps()),
  });
}

export async function POST(req: Request) {
  let body: {
    entryId?: string;
    targetTopicId?: string;
    newAlias?: string;
    newTopicName?: string;
    resolvedBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.entryId?.trim() || !body.resolvedBy?.trim()) {
    return Response.json(
      { error: 'entryId and resolvedBy are required' },
      { status: 400 },
    );
  }

  const db = eiStore.db;
  const useCase = createResolveNormalizationEntryUseCase(db);

  try {
    const result = await useCase.execute({
      entryId: body.entryId,
      targetTopicId: body.targetTopicId,
      newAlias: body.newAlias,
      newTopicName: body.newTopicName,
      resolvedBy: body.resolvedBy,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
