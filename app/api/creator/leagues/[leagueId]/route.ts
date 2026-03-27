import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorLeagueById, updateCreatorLeague } from '@/lib/creator-system'
import type { UpsertCreatorLeagueInput } from '@/lib/creator-system/types'

export const dynamic = 'force-dynamic'

function getBaseUrl(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    const viewerUserId = session?.user?.id ?? null
    const viewerEmail = session?.user?.email ?? null
    const inviteCode = new URL(req.url).searchParams.get('join') || new URL(req.url).searchParams.get('code')

    const league = await getCreatorLeagueById(
      leagueId,
      viewerUserId,
      getBaseUrl(req),
      viewerEmail,
      inviteCode
    )
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
    return NextResponse.json(league)
  } catch (error) {
    console.error('[api/creator/leagues/[leagueId]]', error)
    return NextResponse.json({ error: 'Failed to load league' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null }
  } | null
  const userId = session?.user?.id
  const viewerEmail = session?.user?.email ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params
  const body = (await req.json().catch(() => ({}))) as Partial<UpsertCreatorLeagueInput>
  const league = await updateCreatorLeague(leagueId, userId, body, getBaseUrl(req), viewerEmail)
  if (!league) return NextResponse.json({ error: 'Unable to update creator league' }, { status: 400 })

  return NextResponse.json(league)
}
