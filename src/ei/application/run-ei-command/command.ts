import type { EiCommand } from '../ei-protocol-router/command-schema';

export interface RunEiCommandInput {
  command: EiCommand;
  studentId: string;
  idempotencyKey?: string;
  correlationId?: string;
}
