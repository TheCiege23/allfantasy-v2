import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Lightweight entry endpoint for homepage "Start mock draft" button.
// It creates (or reuses) a mockDraft row and returns an id + basic config,
// which can be used by the fuller /api/mock-draft/simulate flows later.

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const sport = String(body?.sport || 'NFL')
    const leagueType = String(body?.leagueType || 'redraft')
    const draftType = String(body?.draftType || 'snake')
    const aiEnabled = Boolean(body?.aiEnabled)
    const leagueId = body?.leagueId ?? null
    const numTeams = Math.min(16, Math.max(8, Number(body?.numTeams) || 12))
    const rounds = Math.min(22, Math.max(12, Number(body?.rounds) || 15))
    const timerSeconds = Number(body?.timerSeconds) ?? 0
    const scoringFormat = String(body?.scoringFormat || 'default')

    const metadata = {
      sport,
      leagueType,
      draftType,
      aiEnabled,
      numTeams,
      rounds,
      timerSeconds,
      scoringFormat,
      source: body?.source || 'mock-draft-setup',
    }

    const created = await prisma.mockDraft.create({
      data: {
        leagueId: leagueId || undefined,
        userId: session.user.id,
        rounds,
        results: [],
        proposals: [],
        metadata,
      },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({
      status: 'ok',
      draftId: created.id,
      config: { sport, leagueType, draftType, aiEnabled, numTeams, rounds, timerSeconds, scoringFormat, leagueId: leagueId || undefined },
    })
  } catch (err: any) {
    console.error('[mock-draft/create] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

