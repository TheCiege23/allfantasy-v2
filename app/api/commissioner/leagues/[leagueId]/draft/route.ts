import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getLeagueDrafts, getDraftPicks } from '@/lib/sleeper-client'

/** GET: Draft state from platform (Sleeper). Read-only; use for live draft display. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { platform: true, platformLeagueId: true },
  })
  if (!league || league.platform !== 'sleeper') {
    return NextResponse.json({
      platformSupported: false,
      message: 'Draft state is only available for Sleeper leagues.',
    })
  }

  try {
    const drafts = await getLeagueDrafts(league.platformLeagueId)
    const latest = Array.isArray(drafts) && drafts.length > 0 ? drafts[drafts.length - 1] : null
    if (!latest || !latest.draft_id) {
      return NextResponse.json({
        platformSupported: true,
        draftStatus: null,
        draftId: null,
        picks: [],
        message: 'No draft found for this league.',
      })
    }
    const picks = await getDraftPicks(latest.draft_id)
    return NextResponse.json({
      platformSupported: true,
      draftStatus: latest.status ?? null,
      draftId: latest.draft_id,
      draft: latest,
      picks: picks ?? [],
    })
  } catch (err) {
    return NextResponse.json({
      platformSupported: true,
      error: 'Failed to fetch draft state',
      message: (err as Error)?.message,
    }, { status: 502 })
  }
}

/** Draft controls: pause, resume, reset_timer, undo_pick, assign_pick.
 * Sleeper API is read-only for draft state; controls are not available via API. Returns acknowledged with platformSupported: false.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '').toLowerCase()

  const supported = ['pause', 'resume', 'reset_timer', 'undo_pick', 'assign_pick', 'reorder']
  if (!supported.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Use one of: ${supported.join(', ')}` }, { status: 400 })
  }

  // Stub: platform draft API not wired. Return acknowledged with message.
  return NextResponse.json({
    status: 'acknowledged',
    action,
    message: 'Draft control is not yet wired to your platform. When supported, this will pause/resume draft, reset timer, undo pick, or assign a missed pick.',
    platformSupported: false,
  })
}
