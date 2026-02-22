import type { PostgresStore } from '@mastra/pg';
import * as Q from '../../db/queries';
import type { IStudentAggregatesRepository } from '../../domain/student-aggregates/repository';
import type { StudentAggregates } from '../../domain/student-aggregates/student-aggregates';
import type { StudentAggregatesId } from '../../domain/student-aggregates/value-objects';
import { StudentAggregatesMapper } from './mappers/student-aggregates-mapper';

type DbClient = PostgresStore['db'];

export class PostgresStudentAggregatesRepository implements IStudentAggregatesRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: StudentAggregatesId): Promise<StudentAggregates | null> {
    const row = await Q.getAggregates(this.db, id.studentId);
    return row ? StudentAggregatesMapper.toDomain(row) : null;
  }

  async save(aggregate: StudentAggregates): Promise<void> {
    const data = StudentAggregatesMapper.toPersistence(aggregate);
    await Q.upsertAggregates(this.db, aggregate.studentId, data);
  }
}
