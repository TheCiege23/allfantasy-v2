/**
 * POST /api/leagues/import/resync
 * Re-run normalization + merge for an already-imported external league (commissioner / owner).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedUser } from '@/lib/auth-guard'
import { resolveProvider } from '@/lib/league-import/ImportProviderResolver'
import { isImportProviderAvailable } from '@/lib/league-import/provider-ui-config'
import { resyncImportedLeague } from '@/lib/league-import/resyncImportUtility'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const provider = resolveProvider(typeof body.provider === 'string' ? body.provider : '')
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : ''

  if (!provider || !sourceId) {
    return NextResponse.json({ error: 'provider and sourceId required' }, { status: 400 })
  }
  if (!isImportProviderAvailable(provider)) {
    return NextResponse.json({ error: `Import from ${provider} is not available.` }, { status: 400 })
  }

  const out = await resyncImportedLeague({
    userId: auth.userId,
    provider,
    sourceId,
  })
  if (!out.ok) {
    return NextResponse.json({ error: out.error }, { status: 400 })
  }
  return NextResponse.json({
    ok: true,
    leagueId: out.leagueId,
    runId: out.runId,
    warningCount: out.warningCount,
    reviewRequired: out.reviewRequired,
  })
}
