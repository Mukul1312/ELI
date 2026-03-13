/**
 * ProtocolRouter — stateless command → protocol mapper.
 *
 * AppOpen routing was inlined into ei-app-open.ts (ADR-004 D3) using
 * the `session_phase` projection column instead of event scanning.
 *
 * Remaining routes are deterministic by command type:
 *   IntentSet  → P2 (activation)
 *   SessionEnd → P3 (verification)
 *
 * @see docs/engineering-ddd-design/canvas-ei-runtime.md
 */

import type { EiCommand } from './command-schema';

export type EiCommandWithStudent = EiCommand & { studentId: string };

export class ProtocolRouter {
  /**
   * Decides which protocol to run for the given command.
   * AppOpen is no longer routed here — handled directly by ei-app-open.ts.
   */
  async decideProtocol(command: EiCommandWithStudent): Promise<2 | 3> {
    switch (command.commandType) {
      case 'IntentSet':
        return 2; // Always P2 — client accepted intent, now activating
      case 'SessionEnd':
        return 3; // Always P3 — client ended session, now verify
      default:
        throw new Error(`ProtocolRouter: unexpected commandType "${command.commandType}" (AppOpen is handled inline)`);
    }
  }
}
