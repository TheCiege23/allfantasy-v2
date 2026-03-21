import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
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
  return normalizeToSupportedSport(normalized.league.sport)
}

function resolveImportedLeagueVariant(normalized: NormalizedImportResult): string | null {
  const leagueData = normalized.league as Record<string, unknown>
  const explicit =
    leagueData.league_variant ??
    leagueData.leagueVariant ??
    leagueData.variant
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim()
  }

  const sport = resolveImportedLeagueSport(normalized)
  if (sport !== 'NFL') return null

  const scoringFormat = String(
    normalized.league.scoring ??
      normalized.scoring?.scoring_format ??
      ''
  ).toUpperCase()
  const rosterPositions = Array.isArray(leagueData.roster_positions)
    ? (leagueData.roster_positions as unknown[])
        .map((p) => String(p).toUpperCase())
    : []
  const hasIdpSignal =
    scoringFormat.includes('IDP') ||
    rosterPositions.some((p) =>
      ['DE', 'DT', 'LB', 'CB', 'S', 'DL', 'DB', 'IDP_FLEX'].includes(p)
    )

  if (!hasIdpSignal) return null
  return normalized.league.isDynasty ? 'DYNASTY_IDP' : 'IDP'
}

function buildImportedLeagueSettings(normalized: NormalizedImportResult): Record<string, unknown> {
  const sportType = resolveImportedLeagueSport(normalized)
  const leagueVariant = resolveImportedLeagueVariant(normalized)
  return {
    ...(normalized.league as Record<string, unknown>),
    playoff_team_count: normalized.league.playoff_team_count,
    roster_positions: (normalized.league as Record<string, unknown>).roster_positions,
    scoring_settings: (normalized.league as Record<string, unknown>).scoring_settings,
    sport_type: sportType,
    league_variant: leagueVariant,
    source_tracking: {
      ...normalized.source,
    },
    identity_mappings: normalized.identity_mappings ?? [],
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

  if (args.provider === 'fantrax') {
    const { syncFantraxHistoricalBackfillAfterImport } = await import(
      '@/lib/league-import/fantrax/FantraxHistoricalBackfillService'
    )
    return syncFantraxHistoricalBackfillAfterImport({
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

  const resolvedSport = resolveImportedLeagueSport(normalized)
  const resolvedVariant = resolveImportedLeagueVariant(normalized)
  const leaguePayload = {
    name: normalized.league.name,
    platform: provider,
    platformLeagueId,
    leagueSize: normalized.league.leagueSize,
    scoring: normalized.league.scoring ?? undefined,
    isDynasty: normalized.league.isDynasty,
    sport: resolvedSport,
    season: normalized.league.season ?? undefined,
    rosterSize: normalized.league.rosterSize ?? undefined,
    starters: (normalized.league as Record<string, unknown>).roster_positions ?? undefined,
    avatarUrl: normalized.league_branding?.avatar_url ?? undefined,
    settings: buildImportedLeagueSettings(normalized),
    syncStatus: 'pending',
    leagueVariant: resolvedVariant,
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
