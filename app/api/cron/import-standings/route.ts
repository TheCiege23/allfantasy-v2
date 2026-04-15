import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const season = String(new Date().getFullYear())
  let imported = 0
  let errors = 0

  for (const sport of SUPPORTED_SPORTS) {
    try {
      const result = await fetchWithChain({ sport, dataType: 'standings', query: { season }, forceRefresh: true })
      if (result.data) imported++
    } catch (e) {
      console.warn(`[import-standings] ${sport} failed:`, e instanceof Error ? e.message : e)
      errors++
    }
  }

  console.log(`[import-standings] imported=${imported} errors=${errors}`)
  return NextResponse.json({ ok: true, imported, errors })
}
