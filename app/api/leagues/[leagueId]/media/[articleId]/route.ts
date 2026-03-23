import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { getArticleById } from '@/lib/sports-media-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/media/[articleId]
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; articleId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, articleId } = await ctx.params
    if (!leagueId || !articleId) {
      return NextResponse.json({ error: 'Missing leagueId or articleId' }, { status: 400 })
    }
    try {
      await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const article = await getArticleById(articleId, leagueId)
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    return NextResponse.json({ article })
  } catch (e) {
    console.error('[media article GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load article' },
      { status: 500 }
    )
  }
}
