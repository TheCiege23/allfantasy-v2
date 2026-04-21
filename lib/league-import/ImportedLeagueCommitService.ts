import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { calculateAndSaveRank } from '@/lib/rank/calculateRank'
import { deriveImportStatsFromNormalized } from '@/lib/rank/deriveImportStatsFromNormalized'
import { SETTINGS_SNAPSHOT_VERSION } from '@/lib/league-contract/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { CanonicalImportBundle, ImportProvider, NormalizedImportResult } from './types'

export class ImportedLeagueConflictError extends Error {}

export interface PersistImportedLeagueOptions {
  userId: string
  provider: ImportProvider
  normalized: NormalizedImportResult
  allowUpdateExisting?: boolean
  /** When set, merges canonical `SettingsSnapshot` + concept rules into `League.settings` and top-level league fields. */
  canonicalBundle?: CanonicalImportBundle
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

/** Merges canonical snapshot slices + `importCanonical` into arbitrary league `settings` JSON (e.g. existing-league import). */
export function mergeCanonicalBundleIntoLeagueSettingsJson(
  base: Record<string, unknown>,
  bundle: CanonicalImportBundle,
): Record<string, unknown> {
  const snap = bundle.settingsSnapshot
  return {
    ...base,
    snapshotVersion: SETTINGS_SNAPSHOT_VERSION,
    rosterSettings: snap.rosterSettings ?? (base as { rosterSettings?: unknown }).rosterSettings,
    scoringSettings: snap.scoringSettings ?? (base as { scoringSettings?: unknown }).scoringSettings,
    draftSettings: snap.draftSettings ?? (base as { draftSettings?: unknown }).draftSettings,
    waiverSettings: snap.waiverSettings ?? (base as { waiverSettings?: unknown }).waiverSettings,
    playoffSettings: snap.playoffSettings ?? (base as { playoffSettings?: unknown }).playoffSettings,
    conceptRules: snap.conceptRules ?? (base as { conceptRules?: unknown }).conceptRules,
    commissionerSettings: snap.commissionerSettings ?? (base as { commissionerSettings?: unknown }).commissionerSettings,
    mediaSettings: snap.mediaSettings ?? (base as { mediaSettings?: unknown }).mediaSettings,
    visualTheme: snap.visualTheme ?? (base as { visualTheme?: unknown }).visualTheme,
    importCanonical: {
      presetKey: bundle.presetKey,
      scoringPresetId: bundle.scoringPresetId,
      draftType: bundle.draftType,
      inferredConcept: bundle.inferredConcept,
    },
  }
}

function mergeCanonicalBundleIntoSettings(
  normalized: NormalizedImportResult,
  bundle: CanonicalImportBundle,
): Record<string, unknown> {
  return mergeCanonicalBundleIntoLeagueSettingsJson(buildImportedLeagueSettings(normalized), bundle)
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
  const { userId, provider, normalized, allowUpdateExisting = false, canonicalBundle } = options
  const platformLeagueId = normalized.source.source_league_id
  const seasonYear =
    typeof normalized.league.season === 'number' && Number.isFinite(normalized.league.season)
      ? normalized.league.season
      : new Date().getFullYear()

  const existing = await (prisma as any).league.findFirst({
    where: {
      userId,
      platform: provider,
      platformLeagueId,
      season: seasonYear,
    },
  })

  if (existing && !allowUpdateExisting) {
    throw new ImportedLeagueConflictError('This league already exists in your account')
  }

  const resolvedSport = resolveImportedLeagueSport(normalized)
  const resolvedVariant = resolveImportedLeagueVariant(normalized)
  const derivedImport = deriveImportStatsFromNormalized(normalized)
  const importStatsPatch = derivedImport
    ? {
        importWins: derivedImport.importWins,
        importLosses: derivedImport.importLosses,
        importTies: derivedImport.importTies,
        importMadePlayoffs: derivedImport.importMadePlayoffs,
        importWonChampionship: derivedImport.importWonChampionship,
        importFinalStanding: derivedImport.importFinalStanding,
        importPointsFor: derivedImport.importPointsFor,
        importPointsAgainst: derivedImport.importPointsAgainst,
      }
    : {}

  const settingsJson = canonicalBundle
    ? mergeCanonicalBundleIntoSettings(normalized, canonicalBundle)
    : buildImportedLeagueSettings(normalized)

  const leaguePayload = {
    name: normalized.league.name,
    platform: provider,
    platformLeagueId,
    leagueSize: normalized.league.leagueSize,
    scoring: normalized.league.scoring ?? undefined,
    isDynasty: normalized.league.isDynasty,
    sport: resolvedSport,
    season: seasonYear,
    rosterSize: normalized.league.rosterSize ?? undefined,
    starters: (normalized.league as Record<string, unknown>).roster_positions ?? undefined,
    avatarUrl: normalized.league_branding?.avatar_url ?? undefined,
    settings: settingsJson,
    syncStatus: 'pending',
    leagueVariant: resolvedVariant,
    leagueType: canonicalBundle?.leagueTypeColumn ?? undefined,
    presetKey: canonicalBundle?.presetKey ?? undefined,
    scoringPresetId: canonicalBundle?.scoringPresetId ?? undefined,
    settingsSnapshotVersion: canonicalBundle ? SETTINGS_SNAPSHOT_VERSION : undefined,
    importBatchId: normalized.source.import_batch_id ?? undefined,
    importedAt: normalized.source.imported_at ? new Date(normalized.source.imported_at) : undefined,
    ...importStatsPatch,
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

  // Layered import, tier 1 (synchronous): write a LeagueSeason row for the
  // CURRENT season from the normalized payload so the History tab shows a
  // real entry immediately. Older years come in via tier 2 (async backfill).
  try {
    const seasonYearForRow = typeof normalized.league.season === 'number' && Number.isFinite(normalized.league.season)
      ? normalized.league.season
      : new Date().getFullYear()
    const topStanding = [...normalized.standings].sort((a, b) => a.rank - b.rank)[0] ?? null
    const runnerUpStanding = [...normalized.standings].sort((a, b) => a.rank - b.rank)[1] ?? null
    const nameForTeamId = (sourceTeamId: string | undefined): string | null => {
      if (!sourceTeamId) return null
      const r = normalized.rosters.find((row) => row.source_team_id === sourceTeamId)
      return r?.team_name?.trim() || r?.owner_name?.trim() || null
    }
    await prisma.leagueSeason.upsert({
      where: {
        leagueId_season: { leagueId: league.id, season: seasonYearForRow },
      } as never,
      create: {
        leagueId: league.id,
        season: seasonYearForRow,
        platformLeagueId: normalized.source.source_league_id,
        championName: nameForTeamId(topStanding?.source_team_id),
        runnerUpName: nameForTeamId(runnerUpStanding?.source_team_id),
        teamCount: normalized.rosters.length || normalized.league.leagueSize,
        scoringFormat: normalized.scoring?.scoring_format ?? null,
        isDynasty: normalized.league.isDynasty,
        status: 'active',
      },
      update: {
        platformLeagueId: normalized.source.source_league_id,
        championName: nameForTeamId(topStanding?.source_team_id),
        runnerUpName: nameForTeamId(runnerUpStanding?.source_team_id),
        teamCount: normalized.rosters.length || normalized.league.leagueSize,
        scoringFormat: normalized.scoring?.scoring_format ?? null,
        isDynasty: normalized.league.isDynasty,
      },
    }).catch(() => {
      /* unique-constraint key name varies by schema — best-effort write */
    })
  } catch (err) {
    console.warn('[ImportedLeagueCommitService] current-season LeagueSeason write non-fatal:', err)
  }

  // Fire-and-forget avatar mirror: external CDN URLs (Sleeper, ESPN, etc.)
  // can 404 later; mirror them to our storage. Pluggable — no-ops until
  // the storage adapter is wired.
  void (async () => {
    try {
      const { mirrorImportAvatars } = await import('./avatarMirror')
      await mirrorImportAvatars(league.id)
    } catch {
      /* non-fatal */
    }
  })()

  // Layered import, tier 2 (async): commit returns immediately; the
  // multi-year history backfill runs in the background. The History tab
  // polls /api/leagues/{id}/history and surfaces each year as it lands.
  const historicalBackfill: unknown = { status: 'pending', startedAt: new Date().toISOString() }
  try {
    const current = (await prisma.league.findUnique({
      where: { id: league.id },
      select: { settings: true },
    }))?.settings as Record<string, unknown> | null
    await prisma.league.update({
      where: { id: league.id },
      data: {
        settings: {
          ...(current ?? {}),
          historicalBackfillStatus: 'pending',
          historicalBackfillStartedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })
  } catch {
    /* non-fatal settings stamp */
  }
  void runHistoricalBackfill({ provider, leagueId: league.id, userId, normalized })
    .then(async (result) => {
      try {
        const current = (await prisma.league.findUnique({
          where: { id: league.id },
          select: { settings: true },
        }))?.settings as Record<string, unknown> | null
        await prisma.league.update({
          where: { id: league.id },
          data: {
            settings: {
              ...(current ?? {}),
              historicalBackfillStatus: 'complete',
              historicalBackfillCompletedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        })
      } catch {
        /* non-fatal */
      }
      return result
    })
    .catch(async (err) => {
      console.warn(`[ImportedLeagueCommitService] Historical ${provider} backfill non-fatal:`, err)
      try {
        const current = (await prisma.league.findUnique({
          where: { id: league.id },
          select: { settings: true },
        }))?.settings as Record<string, unknown> | null
        await prisma.league.update({
          where: { id: league.id },
          data: {
            settings: {
              ...(current ?? {}),
              historicalBackfillStatus: 'failed',
              historicalBackfillError: err instanceof Error ? err.message : 'unknown',
            } as Prisma.InputJsonValue,
          },
        })
      } catch {
        /* non-fatal */
      }
    })

  try {
    await calculateAndSaveRank(userId)
  } catch (err) {
    console.warn('[ImportedLeagueCommitService] calculateAndSaveRank non-fatal:', err)
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
