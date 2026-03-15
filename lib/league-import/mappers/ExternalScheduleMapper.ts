/**
 * Maps provider-specific matchups/schedule into NormalizedMatchup[].
 */

import type { NormalizedMatchup } from '../types'

export interface IExternalScheduleMapper<P = unknown> {
  map(source: P): NormalizedMatchup[]
}
