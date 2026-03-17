import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorLeagueById } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const viewerUserId = session?.user?.id ?? null
    const baseUrl = getBaseUrl(req)

    const league = await getCreatorLeagueById(leagueId, viewerUserId, baseUrl)
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
    return NextResponse.json(league)
  } catch (e) {
    console.error('[api/creator/leagues/[leagueId]]', e)
    return NextResponse.json({ error: 'Failed to load league' }, { status: 500 })
  }
}
