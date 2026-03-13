import { createSearchTopicsUseCase } from '@/lib/curriculum-catalog';
import { eiStore } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') ?? '';
  const instituteId = url.searchParams.get('instituteId') ?? undefined;
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

  if (query.trim().length < 2) {
    return Response.json({ results: [] });
  }

  const db = eiStore.db;
  const useCase = createSearchTopicsUseCase(db);
  const results = await useCase.execute({ query, instituteId, limit });

  return Response.json({ results });
}
