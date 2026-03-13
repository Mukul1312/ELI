import { createResolveTopicUseCase } from '@/lib/curriculum-catalog';
import { eiStore } from '@/ei/runtime/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { rawText?: string; studentId?: string; instituteId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.rawText?.trim() || !body.studentId?.trim()) {
    return Response.json({ error: 'rawText and studentId are required' }, { status: 400 });
  }

  const db = eiStore.db;
  const useCase = createResolveTopicUseCase(db);
  const topicRef = await useCase.execute({
    rawText: body.rawText,
    studentId: body.studentId,
    instituteId: body.instituteId,
  });

  return Response.json({ topicId: topicRef.topicId, topicName: topicRef.topicName });
}
