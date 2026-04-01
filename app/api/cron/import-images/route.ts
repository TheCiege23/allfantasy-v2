import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runImageImporter, shouldRunMonthlyTeamLogoRefresh } from '@/lib/workers/image-importer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true'
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'auto'
  const forceRefresh = parseBoolean(req.nextUrl.searchParams.get('force'))
  const includeTeamLogos =
    scope === 'all' || scope === 'teams' || (scope === 'auto' && shouldRunMonthlyTeamLogoRefresh())
  const includePlayerHeadshots = scope !== 'teams'

  try {
    const result = await runImageImporter({
      forceRefresh,
      includePlayerHeadshots,
      includeTeamLogos,
    })

    return NextResponse.json({
      ok: true,
      scope,
      includePlayerHeadshots,
      includeTeamLogos,
      ...result,
    })
  } catch (error) {
    console.error('[cron/import-images]', error)
    return NextResponse.json({ error: 'Image import failed' }, { status: 500 })
  }
}
