/**
 * POST /api/leagues/import/commit
 *
 * Unified import commit: deterministic (no AI). Accepts provider + sourceId,
 * runs same normalization as preview, creates League and bootstraps rosters,
 * scoring (in settings), draft/waiver/playoff/schedule. Returns new league id/name/sport.
 *
 * Body: { provider: 'sleeper', sourceId: string }
 * Returns: { leagueId: string, name: string, sport: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedUser } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'
import type { ImportProvider } from '@/lib/league-import/types'

function mapImportCommitErrorStatus(code: string): number {
  if (code === 'LEAGUE_NOT_FOUND') return 404
  if (code === 'UNAUTHORIZED') return 401
  if (code === 'CONNECTION_REQUIRED') return 400
  return 500
}

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) {
    return auth.response
  }

  let body: { provider?: string; sourceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const provider = (body.provider ?? '').trim().toLowerCase() as ImportProvider
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : ''

  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
  }

  if (!isImportProviderAvailable(provider)) {
    return NextResponse.json(
      { error: `Import from ${provider} is not yet available. Use Sleeper.` },
      { status: 400 }
    )
  }

  const result = await runImportedLeagueNormalizationPipeline({
    provider,
    sourceId,
    userId: auth.userId,
  })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: mapImportCommitErrorStatus(result.code) }
    )
  }

  const { normalized } = result
  const platformLeagueId = normalized.source.source_league_id

  const existing = await (prisma as any).league.findFirst({
    where: {
      userId: auth.userId,
      platform: provider,
      platformLeagueId,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'This league already exists in your account' },
      { status: 409 }
    )
  }

  const normalizedSport = String(normalized.league.sport ?? '').toUpperCase()
  const leagueSport =
    (normalizedSport === 'NFL' ||
      normalizedSport === 'NBA' ||
      normalizedSport === 'MLB' ||
      normalizedSport === 'NHL' ||
      normalizedSport === 'NCAAF' ||
      normalizedSport === 'NCAAB' ||
      normalizedSport === 'SOCCER')
      ? normalizedSport
      : 'NFL'

  const settingsFromImport: Record<string, unknown> = {
    ...(normalized.league as Record<string, unknown>),
    playoff_team_count: normalized.league.playoff_team_count,
    roster_positions: (normalized.league as Record<string, unknown>).roster_positions,
    scoring_settings: (normalized.league as Record<string, unknown>).scoring_settings,
  }

  const league = await (prisma as any).league.create({
    data: {
      userId: auth.userId,
      name: normalized.league.name,
      platform: provider,
      platformLeagueId,
      leagueSize: normalized.league.leagueSize,
      scoring: normalized.league.scoring ?? undefined,
      isDynasty: normalized.league.isDynasty,
      sport: leagueSport,
      leagueVariant: null,
      season: normalized.league.season ?? undefined,
      rosterSize: normalized.league.rosterSize ?? undefined,
      starters: (normalized.league as Record<string, unknown>).roster_positions ?? undefined,
      avatarUrl: normalized.league_branding?.avatar_url ?? undefined,
      settings: settingsFromImport,
      syncStatus: 'pending',
      importBatchId: normalized.source.import_batch_id ?? undefined,
      importedAt: normalized.source.imported_at ? new Date(normalized.source.imported_at) : undefined,
    },
  })

  try {
    const { bootstrapLeagueFromImport } = await import('@/lib/league-import/LeagueCreationBootstrapService')
    await bootstrapLeagueFromImport(league.id, normalized)
  } catch (err) {
    console.warn(`[leagues/import/commit] ${provider} import bootstrap non-fatal:`, err)
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
    console.warn('[leagues/import/commit] Gap-fill (draft/waiver/playoff/schedule) non-fatal:', err)
  }

  let historicalBackfill: unknown = null
  if (provider === 'sleeper') {
    try {
      const { syncSleeperHistoricalBackfillAfterImport } = await import(
        '@/lib/league-import/sleeper/SleeperHistoricalBackfillService'
      )
      historicalBackfill = await syncSleeperHistoricalBackfillAfterImport({
        leagueId: league.id,
        isDynasty: normalized.league.isDynasty,
      })
    } catch (err) {
      console.warn('[leagues/import/commit] Historical Sleeper backfill non-fatal:', err)
    }
  }

  return NextResponse.json({
    leagueId: league.id,
    name: league.name,
    sport: league.sport,
    league: { id: league.id, name: league.name, sport: league.sport },
    historicalBackfill,
  })
}
