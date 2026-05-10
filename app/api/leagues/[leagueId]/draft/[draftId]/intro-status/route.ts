import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import {
  normalizeDraftTypeKey,
  resolveDraftIntroPosterUrl,
  resolveDraftIntroVideoUrl,
} from '@/lib/draft/draft-intro-video'

export const dynamic = 'force-dynamic'

type SessionShape = {
  user?: {
    id?: string
  }
} | null

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string; draftId: string }> },
) {
  const session = (await getServerSession(authOptions as any)) as SessionShape
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftId } = await params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const draftSession = await prisma.draftSession.findFirst({
    where: {
      id: draftId,
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

  const record = await (prisma as any).draftIntroView.findUnique({
    where: {
      draftSessionId_userId: {
        draftSessionId: draftId,
        userId,
      },
    },
    select: {
      id: true,
      seenAt: true,
      draftTypeKey: true,
      videoUrl: true,
    },
  })

  const draftTypeKey = normalizeDraftTypeKey(record?.draftTypeKey ?? draftSession.draftType)
  const videoUrl = record?.videoUrl ?? resolveDraftIntroVideoUrl(draftTypeKey)
  const posterUrl = resolveDraftIntroPosterUrl(draftTypeKey)

  return NextResponse.json({
    seen: Boolean(record?.seenAt ?? record?.id),
    draftTypeKey: draftTypeKey || null,
    videoUrl,
    posterUrl,
  })
}