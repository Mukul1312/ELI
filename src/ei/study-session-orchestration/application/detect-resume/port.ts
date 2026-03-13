/**
 * IDetectResumeUseCase — driver port for resume detection.
 *
 * Per tactical spec §8: driver ports in application/{use-case}/port.ts
 * Per canvas R1.3: "AppOpen (initial: true) → interrupted session check"
 */

import type { SduiResponse } from '../../types/sdui-contract';
import type { DetectResumeQuery } from './query';

export type ResumeDetectionResult =
  | { readonly resumed: false }
  | { readonly resumed: true; readonly response: SduiResponse };

export interface IDetectResumeUseCase {
  execute(query: DetectResumeQuery): Promise<ResumeDetectionResult>;
}
