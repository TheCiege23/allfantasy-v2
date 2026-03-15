import { resolveProvider } from './ImportProviderResolver'
import { getAdapter } from './LeagueImportRegistry'
import type { NormalizedImportResult } from './types'
import type { ImportProvider } from './types'

export interface PipelineInput {
  provider: ImportProvider | string
  raw: unknown
}

/**
 * Single entry point: resolve provider, get adapter, normalize raw payload to AF-shaped result.
 * Does not create leagues or persist; use output with league creation or legacy transfer flow.
 */
export async function runImportNormalizationPipeline(input: PipelineInput): Promise<NormalizedImportResult> {
  const provider = typeof input.provider === 'string' ? resolveProvider(input.provider) : input.provider
  if (!provider) throw new Error(`Unsupported import provider: ${input.provider}`)
  const adapter = getAdapter(provider)
  return adapter.normalize(input.raw)
}
