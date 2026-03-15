import { NextResponse } from 'next/server'
import { listCommentary } from '@/lib/commentary-engine'
import type { CommentaryEventType } from '@/lib/commentary-engine/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/commentary
 * Query: eventType, limit, cursor.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const eventType = url.searchParams.get('eventType') as CommentaryEventType | null
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 50)
    const cursor = url.searchParams.get('cursor') ?? undefined

    const result = await listCommentary({ leagueId, eventType, limit, cursor })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[commentary GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list commentary' },
      { status: 500 }
    )
  }
}
