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
} from '@/ei/sdui/types/sdui-contract';
export type { SduiComponent } from '@/ei/sdui/types/components';
