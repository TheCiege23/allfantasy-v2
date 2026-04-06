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

  let saved = 0
  let errors = 0
  let attempts = 0

  for (const sport of SUPPORTED_SPORTS) {
    attempts++
    try {
      const result = await fetchWithChain({
        sport,
        dataType: 'news',
        forceRefresh: true,
      })
      if (Array.isArray(result.data)) saved += result.data.length
    } catch (e: unknown) {
      console.error(`[import-news] ${sport}:`, e instanceof Error ? e.message : e)
      errors++
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`[import-news] saved=${saved} errors=${errors}`)
  const status = attempts > 0 && errors === attempts ? 500 : 200
  return NextResponse.json({ saved, errors }, { status })
}
