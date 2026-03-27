import { NextRequest, NextResponse } from 'next/server'
import { getCreators, getCreatorsLeaderboard } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const visibility = (searchParams.get('visibility') as 'public' | 'unlisted' | 'all') || 'public'
    const sport = searchParams.get('sport') || undefined
    const limit = Math.min(Number(searchParams.get('limit')) || 24, 48)
    const sort = searchParams.get('sort') as 'members' | 'leagues' | null
    const cursor = searchParams.get('cursor') || undefined
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${proto}://${host}`

    if (sort === 'members' || sort === 'leagues') {
      const creators = await getCreatorsLeaderboard({
        limit,
        sort,
      })
      return NextResponse.json({ ok: true, creators })
    }

    const result = await getCreators({ visibility, sport, limit, cursor, baseUrl })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[api/creators]', e)
    return NextResponse.json({ error: 'Failed to list creators' }, { status: 500 })
  }
}
