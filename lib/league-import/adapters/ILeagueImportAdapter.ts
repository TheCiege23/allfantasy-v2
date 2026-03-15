import type { ImportProvider } from '../types'
import type { NormalizedImportResult } from '../types'

/** Adapter contract: take provider-specific raw payload, return normalized AF-shaped result. */
export interface ILeagueImportAdapter<P = unknown> {
  readonly provider: ImportProvider
  normalize(raw: P): Promise<NormalizedImportResult>
}
