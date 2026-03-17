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
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'
import type { ImportProvider } from '@/lib/league-import/types'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // Sleeper: deterministic fetch + normalize (no AI)
  if (provider === 'sleeper') {
    const result = await runImportedLeagueNormalizationPipeline(sourceId)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'LEAGUE_NOT_FOUND' ? 404 : 500 }
      )
    }
    const preview = buildImportedLeaguePreview(result.normalized)
    return NextResponse.json(preview)
  }

  return NextResponse.json(
    { error: `Import from ${provider} is not yet available.` },
    { status: 400 }
  )
}
