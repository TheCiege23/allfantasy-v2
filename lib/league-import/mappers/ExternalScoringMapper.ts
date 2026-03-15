/**
 * Maps provider-specific scoring config into NormalizedScoring.
 */

import type { NormalizedScoring } from '../types'

export interface IExternalScoringMapper<P = unknown> {
  map(source: P): NormalizedScoring | null
}
