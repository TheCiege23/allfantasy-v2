import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'

export type SleeperImportPreviewFailureCode =
  | 'LEAGUE_NOT_FOUND'
  | 'NORMALIZATION_FAILED'
  | 'CONNECTION_REQUIRED'
  | 'UNAUTHORIZED'

export interface SleeperImportPreviewSuccess {
  success: true
  preview: ReturnType<typeof buildImportedLeaguePreview>
}

export interface SleeperImportPreviewFailure {
  success: false
  error: string
  code: SleeperImportPreviewFailureCode
}

export async function getSleeperImportPreview(args: {
  sourceId: string
  userId?: string
}): Promise<SleeperImportPreviewSuccess | SleeperImportPreviewFailure> {
  const normalized = await runImportedLeagueNormalizationPipeline({
    provider: 'sleeper',
    sourceId: args.sourceId,
    userId: args.userId,
  })

  if (!normalized.success) {
    return normalized
  }

  return {
    success: true,
    preview: buildImportedLeaguePreview(normalized.normalized),
  }
}
