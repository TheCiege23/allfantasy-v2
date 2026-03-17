import { NextRequest, NextResponse } from 'next/server'
import { getCreators } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const visibility = (searchParams.get('visibility') as 'public' | 'unlisted' | 'all') || 'public'
    const sport = searchParams.get('sport') || undefined
    const limit = Math.min(Number(searchParams.get('limit')) || 24, 48)
    const cursor = searchParams.get('cursor') || undefined

    const result = await getCreators({ visibility, sport, limit, cursor })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[api/creators]', e)
    return NextResponse.json({ error: 'Failed to list creators' }, { status: 500 })
  }
}
