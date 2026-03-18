import { prisma } from '@/lib/prisma'
import type { ImportProvider, NormalizedImportResult } from './types'

export class ImportedLeagueConflictError extends Error {}

export interface PersistImportedLeagueOptions {
  userId: string
  provider: ImportProvider
  normalized: NormalizedImportResult
  allowUpdateExisting?: boolean
}

export interface PersistImportedLeagueResult {
  league: {
    id: string
    name: string
    sport: string
  }
  historicalBackfill: unknown
  existed: boolean
}

function resolveImportedLeagueSport(normalized: NormalizedImportResult): string {
  const normalizedSport = String(normalized.league.sport ?? '').toUpperCase()
  return normalizedSport === 'NFL' ||
    normalizedSport === 'NBA' ||
    normalizedSport === 'MLB' ||
    normalizedSport === 'NHL' ||
    normalizedSport === 'NCAAF' ||
    normalizedSport === 'NCAAB' ||
    normalizedSport === 'SOCCER'
    ? normalizedSport
    : 'NFL'
}

function buildImportedLeagueSettings(normalized: NormalizedImportResult): Record<string, unknown> {
  return {
    ...(normalized.league as Record<string, unknown>),
    playoff_team_count: normalized.league.playoff_team_count,
    roster_positions: (normalized.league as Record<string, unknown>).roster_positions,
    scoring_settings: (normalized.league as Record<string, unknown>).scoring_settings,
  }
}

async function runHistoricalBackfill(args: {
  provider: ImportProvider
  leagueId: string
  userId: string
  normalized: NormalizedImportResult
}): Promise<unknown> {
  if (args.provider === 'sleeper') {
    const { syncSleeperHistoricalBackfillAfterImport } = await import(
      '@/lib/league-import/sleeper/SleeperHistoricalBackfillService'
    )
    return syncSleeperHistoricalBackfillAfterImport({
      leagueId: args.leagueId,
      isDynasty: args.normalized.league.isDynasty,
    })
  }

  if (args.provider === 'yahoo') {
    const { syncYahooHistoricalBackfillAfterImport } = await import(
      '@/lib/league-import/yahoo/YahooHistoricalBackfillService'
    )
    return syncYahooHistoricalBackfillAfterImport({
      leagueId: args.leagueId,
      userId: args.userId,
    })
  }

  if (args.provider === 'espn') {
    const { syncEspnHistoricalBackfillAfterImport } = await import(
      '@/lib/league-import/espn/EspnHistoricalBackfillService'
    )
    return syncEspnHistoricalBackfillAfterImport({
      leagueId: args.leagueId,
      userId: args.userId,
    })
  }

  if (args.provider === 'mfl') {
    const { syncMflHistoricalBackfillAfterImport } = await import(
      '@/lib/league-import/mfl/MflHistoricalBackfillService'
    )
    return syncMflHistoricalBackfillAfterImport({
      leagueId: args.leagueId,
      userId: args.userId,
    })
  }

  return null
}

export async function persistImportedLeagueFromNormalization(
  options: PersistImportedLeagueOptions
): Promise<PersistImportedLeagueResult> {
  const { userId, provider, normalized, allowUpdateExisting = false } = options
  const platformLeagueId = normalized.source.source_league_id
  const existing = await (prisma as any).league.findFirst({
    where: {
      userId,
      platform: provider,
      platformLeagueId,
    },
  })

  if (existing && !allowUpdateExisting) {
    throw new ImportedLeagueConflictError('This league already exists in your account')
  }

  const leaguePayload = {
    name: normalized.league.name,
    platform: provider,
    platformLeagueId,
    leagueSize: normalized.league.leagueSize,
    scoring: normalized.league.scoring ?? undefined,
    isDynasty: normalized.league.isDynasty,
    sport: resolveImportedLeagueSport(normalized),
    season: normalized.league.season ?? undefined,
    rosterSize: normalized.league.rosterSize ?? undefined,
    starters: (normalized.league as Record<string, unknown>).roster_positions ?? undefined,
    avatarUrl: normalized.league_branding?.avatar_url ?? undefined,
    settings: buildImportedLeagueSettings(normalized),
    syncStatus: 'pending',
    importBatchId: normalized.source.import_batch_id ?? undefined,
    importedAt: normalized.source.imported_at ? new Date(normalized.source.imported_at) : undefined,
  }

  const league = existing
    ? await (prisma as any).league.update({
        where: { id: existing.id },
        data: leaguePayload,
      })
    : await (prisma as any).league.create({
        data: {
          userId,
          leagueVariant: null,
          ...leaguePayload,
        },
      })

  try {
    const { bootstrapLeagueFromImport } = await import('@/lib/league-import/LeagueCreationBootstrapService')
    await bootstrapLeagueFromImport(league.id, normalized)
  } catch (err) {
    console.warn(`[ImportedLeagueCommitService] ${provider} import bootstrap non-fatal:`, err)
  }

  try {
    const { bootstrapLeagueDraftConfig } = await import('@/lib/draft-defaults/LeagueDraftBootstrapService')
    const { bootstrapLeagueWaiverSettings } = await import('@/lib/waiver-defaults/LeagueWaiverBootstrapService')
    const { bootstrapLeaguePlayoffConfig } = await import('@/lib/playoff-defaults/LeaguePlayoffBootstrapService')
    const { bootstrapLeagueScheduleConfig } = await import('@/lib/schedule-defaults/LeagueScheduleBootstrapService')
    await Promise.all([
      bootstrapLeagueDraftConfig(league.id),
      bootstrapLeagueWaiverSettings(league.id),
      bootstrapLeaguePlayoffConfig(league.id),
      bootstrapLeagueScheduleConfig(league.id),
    ])
  } catch (err) {
    console.warn('[ImportedLeagueCommitService] Gap-fill (draft/waiver/playoff/schedule) non-fatal:', err)
  }

  let historicalBackfill: unknown = null
  try {
    historicalBackfill = await runHistoricalBackfill({
      provider,
      leagueId: league.id,
      userId,
      normalized,
    })
  } catch (err) {
    console.warn(`[ImportedLeagueCommitService] Historical ${provider} backfill non-fatal:`, err)
  }

  return {
    league: {
      id: league.id,
      name: league.name,
      sport: league.sport,
    },
    historicalBackfill,
    existed: Boolean(existing),
  }
}
