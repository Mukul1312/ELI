import { createImportCurriculumUseCase } from '@/lib/curriculum-catalog';
import { eiStore } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { instituteId?: string; examId?: string; rows?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.instituteId?.trim() || !body.examId?.trim() || !Array.isArray(body.rows)) {
    return Response.json(
      { error: 'instituteId, examId, and rows[] are required' },
      { status: 400 },
    );
  }

  const db = eiStore.db;
  const useCase = createImportCurriculumUseCase(db);
  const result = await useCase.execute({
    instituteId: body.instituteId,
    examId: body.examId,
    rows: body.rows as Array<{ subject: string; unit: string; chapter: string; topic: string; aliases?: string[] }>,
  });

  return Response.json(result);
}
