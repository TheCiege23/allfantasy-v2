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
import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import {
  ImportedLeagueConflictError,
  persistImportedLeagueFromNormalization,
} from '@/lib/league-import/ImportedLeagueCommitService'
import { resolveProvider } from '@/lib/league-import/ImportProviderResolver'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'

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

  const provider = resolveProvider(body.provider ?? '')
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : ''

  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
  }

  if (!provider) {
    return NextResponse.json({ error: 'Unsupported import provider' }, { status: 400 })
  }

  if (!isImportProviderAvailable(provider)) {
    return NextResponse.json(
      { error: `Import from ${provider} is not yet available.` },
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

  try {
    const persisted = await persistImportedLeagueFromNormalization({
      userId: auth.userId,
      provider,
      normalized: result.normalized,
      allowUpdateExisting: false,
    })

    return NextResponse.json({
      leagueId: persisted.league.id,
      name: persisted.league.name,
      sport: persisted.league.sport,
      league: persisted.league,
      historicalBackfill: persisted.historicalBackfill,
    })
  } catch (error) {
    if (error instanceof ImportedLeagueConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    throw error
  }
}
