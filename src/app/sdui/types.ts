/**
 * SDUI types — re-export from EI contract.
 * App layer depends on EI contract only.
 */

export type {
  SduiViewTree,
  SduiAction,
  SduiPhase,
  SduiResponse,
  P1WrappedResponse,
  SduiSlotEntry,
  SduiGroupedComponent,
} from '@/ei/study-session-orchestration/types/sdui-contract';
export { unwrapSlotEntry } from '@/ei/study-session-orchestration/types/sdui-contract';
export type { SduiComponent } from '@/ei/study-session-orchestration/domain/types/components';
