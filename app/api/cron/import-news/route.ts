import { NextRequest, NextResponse } from 'next/server'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let saved = 0
  let errors = 0

  for (const sport of SUPPORTED_SPORTS) {
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
  return NextResponse.json({ saved, errors })
}
