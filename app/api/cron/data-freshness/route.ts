import { NextRequest, NextResponse } from 'next/server'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const REFRESH_DATA_TYPES = ['players', 'teams', 'injuries', 'news', 'schedule', 'standings'] as const

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}
  let refreshed = 0
  let errors = 0

  for (const sport of SUPPORTED_SPORTS) {
    for (const dataType of REFRESH_DATA_TYPES) {
      try {
        await fetchWithChain({ sport, dataType, forceRefresh: true })
        results[`${sport}/${dataType}`] = 'ok'
        refreshed++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        results[`${sport}/${dataType}`] = `error: ${msg}`
        errors++
      }
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`[data-freshness] refreshed=${refreshed} errors=${errors}`)
  return NextResponse.json({ refreshed, errors, results })
}
