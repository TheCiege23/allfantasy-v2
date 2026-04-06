import type { ILeagueImportAdapter } from '../ILeagueImportAdapter'
import type { NormalizedImportResult } from '../../types'

/** Placeholder until Fleaflicker fetch + normalization ships. */
export const FleaflickerAdapter: ILeagueImportAdapter<unknown> = {
  provider: 'fleaflicker',
  async normalize(): Promise<NormalizedImportResult> {
    throw new Error('Fleaflicker import is not yet available.')
  },
}
