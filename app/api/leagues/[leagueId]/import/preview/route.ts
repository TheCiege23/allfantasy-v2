/**
 * POST /api/leagues/[leagueId]/import/preview
 *
 * Commissioner-scoped deterministic preview for importing external league data
 * into an existing league.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { runImportedLeagueNormalizationPipeline } from '@/lib/league-import/ImportedLeagueNormalizationPipeline'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'
import { resolveProvider } from '@/lib/league-import/ImportProviderResolver'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'
import {
  DEFAULT_EXISTING_LEAGUE_IMPORT_OPTIONS,
  type ExistingLeagueImportApplyOptions,
} from '@/lib/league-import/LeagueImportToExistingService'

export const dynamic = 'force-dynamic'

function mapImportPreviewErrorStatus(code: string): number {
  if (code === 'LEAGUE_NOT_FOUND') return 404
  if (code === 'UNAUTHORIZED') return 401
  if (code === 'CONNECTION_REQUIRED') return 400
  return 500
}

function resolveApplyOptions(input: unknown): ExistingLeagueImportApplyOptions {
  const patch = (input && typeof input === 'object') ? (input as Partial<ExistingLeagueImportApplyOptions>) : {}
  return {
    leagueStructure: patch.leagueStructure !== false,
    rosters: patch.rosters !== false,
    draftPicks: patch.draftPicks !== false,
    scoringRules: patch.scoringRules !== false,
    leagueName: patch.leagueName !== false,
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const provider = resolveProvider(typeof body.provider === 'string' ? body.provider : '')
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : ''
  const apply = resolveApplyOptions(body.apply)

  if (!provider) {
    return NextResponse.json({ error: 'Unsupported import provider' }, { status: 400 })
  }
  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
  }
  if (!isImportProviderAvailable(provider)) {
    return NextResponse.json({ error: `Import from ${provider} is not yet available.` }, { status: 400 })
  }

  const result = await runImportedLeagueNormalizationPipeline({
    provider,
    sourceId,
    userId,
  })
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: mapImportPreviewErrorStatus(result.code) }
    )
  }

  const preview = buildImportedLeaguePreview(result.normalized)
  return NextResponse.json({
    preview,
    apply: { ...DEFAULT_EXISTING_LEAGUE_IMPORT_OPTIONS, ...apply },
    importData: {
      leagueStructure: true,
      rosters: preview.managers.length,
      draftPicks: preview.draftPickCount,
      scoringRules: preview.playerMap ? (result.normalized.scoring?.rules?.length ?? 0) : 0,
      leagueName: preview.league.name,
    },
  })
}
