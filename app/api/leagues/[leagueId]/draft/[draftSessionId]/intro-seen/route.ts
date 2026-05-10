import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { normalizeDraftTypeKey, resolveDraftIntroVideoUrl } from '@/lib/draft/draft-intro-video'

export const dynamic = 'force-dynamic'

type SessionShape = {
  user?: {
    id?: string
  }
} | null

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string; draftSessionId: string }> },
) {
  const session = (await getServerSession(authOptions as any)) as SessionShape
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftSessionId } = await params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  if (!draftSessionId) return NextResponse.json({ error: 'Missing draftSessionId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const draftSession = await prisma.draftSession.findFirst({
    where: {
      id: draftSessionId,
      leagueId,
    },
    select: {
      id: true,
      draftType: true,
    },
  })

  if (!draftSession) {
    return NextResponse.json({ error: 'Draft session not found' }, { status: 404 })
  }

  const draftTypeKey = normalizeDraftTypeKey(draftSession.draftType)
  const videoUrl = resolveDraftIntroVideoUrl(draftTypeKey)

  await (prisma as any).draftIntroView.upsert({
    where: {
      draftSessionId_userId: {
        draftSessionId,
        userId,
      },
    },
    update: {
      seenAt: new Date(),
      draftTypeKey: draftTypeKey || null,
      videoUrl,
      leagueId,
    },
    create: {
      leagueId,
      draftSessionId,
      userId,
      draftTypeKey: draftTypeKey || null,
      videoUrl,
      seenAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
