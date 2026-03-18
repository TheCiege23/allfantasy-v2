import { NextResponse } from 'next/server'
import { getTrendingMatchups } from '@/lib/trending'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lookbackDays = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

  const items = await getTrendingMatchups({
    lookbackDays: lookbackDays && lookbackDays > 0 ? lookbackDays : 7,
    limit: limit && limit > 0 ? Math.min(limit, 50) : 20,
  })

  return NextResponse.json({
    items,
    period: '7d',
  })
}
