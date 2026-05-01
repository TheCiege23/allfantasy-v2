/**
 * D.5-scheduler — cron route for AllFantasy AI ADP recompute.
 *
 * Auth: CRON_SECRET via Authorization: Bearer <secret> or X-Cron-Secret header.
 * Default behavior: NFL, real-mode picks only, includeTest=false, apply=true.
 * Query params:
 *   - dryRun=true  → apply=false (manual ops escape hatch)
 *   - includeTest=true → opt in to test_seed / test mode picks
 *   - sport=<code> → upper-cased and forwarded
 *   - season=<id>  → narrows recompute
 *
 * Response:
 *   - 200 {ok:true, report}              — clean run
 *   - 207 {ok:false, report}             — report.errors non-empty
 *   - 401 {error:'Unauthorized'}         — missing/wrong secret
 *   - 500 {ok:false, error:<message>}    — recompute threw
 */

import { NextResponse, type NextRequest } from 'next/server'
import { recomputeAllFantasyAdp } from '@/lib/adp/recomputeAllFantasyAdp'
import { requireCronAuth } from '@/app/api/cron/_auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const sportParam = url.searchParams.get('sport')
  const seasonParam = url.searchParams.get('season')
  const includeTest = url.searchParams.get('includeTest') === 'true'
  const dryRun = url.searchParams.get('dryRun') === 'true'

  const args = {
    sport: sportParam ? sportParam.toUpperCase() : 'NFL',
    season: seasonParam ?? null,
    draftMode: 'real' as const,
    includeTest,
    apply: !dryRun,
  }

  try {
    const report = await recomputeAllFantasyAdp(args)
    const hasErrors = Array.isArray(report.errors) && report.errors.length > 0
    return NextResponse.json(
      { ok: !hasErrors, report },
      { status: hasErrors ? 207 : 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
