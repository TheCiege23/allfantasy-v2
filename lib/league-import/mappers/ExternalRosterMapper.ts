/**
 * Maps provider-specific rosters/users into NormalizedRoster[].
 */

import type { NormalizedRoster } from '../types'

export interface IExternalRosterMapper<P = unknown> {
  map(source: P): NormalizedRoster[]
}
