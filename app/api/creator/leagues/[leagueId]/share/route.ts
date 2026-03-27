import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildLeagueShareUrl, getCreatorLeagueById, logAnalytics } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

function getBaseUrl(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    const league = await getCreatorLeagueById(
      leagueId,
      session?.user?.id ?? null,
      getBaseUrl(req),
      session?.user?.email ?? null
    )
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const channel = typeof body.channel === 'string' ? body.channel : 'direct'
    await logAnalytics(league.creatorId, 'invite_share', league.id, {
      channel,
      source: 'league_share_button',
    })

    return NextResponse.json({
      url: buildLeagueShareUrl(league.id, league.inviteCode, getBaseUrl(req)),
    })
  } catch (error) {
    console.error('[api/creator/leagues/[leagueId]/share]', error)
    return NextResponse.json({ error: 'Failed to share creator league' }, { status: 500 })
  }
}
