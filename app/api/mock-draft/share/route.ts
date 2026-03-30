import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, results, draftId } = await req.json()
    if (!draftId && !leagueId) {
      return NextResponse.json({ error: 'leagueId or draftId is required' }, { status: 400 })
    }

    let draft = draftId
      ? await prisma.mockDraft.findFirst({
          where: { id: draftId, userId: session.user.id },
        })
      : await prisma.mockDraft.findFirst({
          where: { leagueId, userId: session.user.id },
          orderBy: { createdAt: 'desc' },
        })

    const safeResults = Array.isArray(results) ? results : Array.isArray(draft?.results) ? draft.results : []
    if (!Array.isArray(safeResults) || safeResults.length === 0) {
      return NextResponse.json({ error: 'results must be a non-empty array' }, { status: 400 })
    }

    if (draft?.shareId) {
      await prisma.mockDraft.update({
        where: { id: draft.id },
        data: { results: safeResults },
      })
      return NextResponse.json({ shareId: draft.shareId })
    }

    const shareId = crypto.randomBytes(8).toString('base64url')

    if (draft) {
      await prisma.mockDraft.update({
        where: { id: draft.id },
        data: { shareId, results: safeResults },
      })
    } else {
      await prisma.mockDraft.create({
        data: {
          leagueId,
          userId: session.user.id,
          rounds: Math.max(...safeResults.map((p: any) => p.round || 0), 1),
          results: safeResults,
          shareId,
        },
      })
    }

    return NextResponse.json({ shareId })
  } catch (err: any) {
    console.error('[mock-draft/share]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
