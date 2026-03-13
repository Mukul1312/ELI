import { createBrowseTreeUseCase } from '@/lib/curriculum-catalog';
import { eiStore } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const examId = url.searchParams.get('examId') ?? undefined;
  const subjectId = url.searchParams.get('subjectId') ?? undefined;
  const unitId = url.searchParams.get('unitId') ?? undefined;
  const chapterId = url.searchParams.get('chapterId') ?? undefined;
  const instituteId = url.searchParams.get('instituteId') ?? undefined;

  const db = eiStore.db;
  const useCase = createBrowseTreeUseCase(db);
  const tree = await useCase.execute({ examId, subjectId, unitId, chapterId, instituteId });

  return Response.json(tree);
}
