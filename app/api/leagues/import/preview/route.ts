/**
 * POST /api/leagues/import/preview
 *
 * Unified import preview: deterministic (no AI). Accepts provider + sourceId,
 * runs normalization pipeline, returns preview (league name, structure, rosters,
 * draft picks, scoring) for display before commit.
 *
 * Body: { provider: 'sleeper', sourceId: string }
 * Returns: ImportPreviewResponse (league, managers, dataQuality, draftPickCount, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedUser } from '@/lib/auth-guard'
import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'
import { resolveProvider } from '@/lib/league-import/ImportProviderResolver'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'
import { getSleeperImportPreview } from '@/lib/league-import/sleeper/SleeperImportPreviewService'

function mapImportPreviewErrorStatus(code: string): number {
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

  if (provider === 'sleeper') {
    const sleeperPreview = await getSleeperImportPreview({
      sourceId,
      userId: auth.userId,
    })
    if (!sleeperPreview.success) {
      return NextResponse.json(
        { error: sleeperPreview.error },
        { status: mapImportPreviewErrorStatus(sleeperPreview.code) }
      )
    }
    return NextResponse.json(sleeperPreview.preview)
  }

  const result = await runImportedLeagueNormalizationPipeline({
    provider,
    sourceId,
    userId: auth.userId,
  })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: mapImportPreviewErrorStatus(result.code) }
    )
  }

  const preview = buildImportedLeaguePreview(result.normalized)
  return NextResponse.json(preview)
}
