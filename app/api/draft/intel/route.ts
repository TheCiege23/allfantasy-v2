import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDraftIntel, listUserDrafts } from '@/lib/draft-intel/sleeperDraftIntelService'

export const dynamic = 'force-dynamic'

/**
 * Live draft intelligence (slice 4).
 *
 * GET /api/draft/intel                → the viewer's Sleeper drafts this season
 *                                       (cross-league; drafting/paused first)
 * GET /api/draft/intel?draftId=…      → full DraftIntelPayload for one draft
 *
 * Honesty contract: no linked Sleeper account → linked:false (never an empty
 * pretend list); upstream down → 502 with an explicit error; the payload's own
 * `missing` list carries any partial-sync facts.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile
    .findUnique({ where: { userId }, select: { sleeperUserId: true } })
    .catch(() => null)
  const sleeperUserId = profile?.sleeperUserId ?? null

  const draftId = req.nextUrl.searchParams?.get('draftId')?.trim()

  if (draftId) {
    const intel = await getDraftIntel(draftId, sleeperUserId)
    if (!intel) {
      return NextResponse.json(
        { linked: Boolean(sleeperUserId), intel: null, error: 'Draft feed temporarily unavailable' },
        { status: 502 },
      )
    }
    return NextResponse.json({ linked: Boolean(sleeperUserId), intel })
  }

  if (!sleeperUserId) {
    return NextResponse.json({ linked: false as const, drafts: null })
  }

  const season = String(new Date().getFullYear())
  const drafts = await listUserDrafts(sleeperUserId, season)
  if (!drafts) {
    return NextResponse.json(
      { linked: true as const, drafts: null, error: 'Draft list temporarily unavailable' },
      { status: 502 },
    )
  }
  return NextResponse.json({ linked: true as const, season, drafts })
}
