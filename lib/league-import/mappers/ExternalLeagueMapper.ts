/**
 * Maps provider-specific league payload into NormalizedLeagueSettings.
 * Each provider implements this interface.
 */

import type { NormalizedLeagueSettings } from '../types'

export interface IExternalLeagueMapper<P = unknown> {
  map(source: P): NormalizedLeagueSettings | null
}
