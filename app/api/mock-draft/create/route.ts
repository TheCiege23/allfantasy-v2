import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createMockDraftSession } from '@/lib/mock-draft-engine/MockDraftSessionService'
import { prisma } from '@/lib/prisma'

// Create mock draft. Uses mock-draft-engine when slotConfig or useSession provided (invite link, human/CPU slots).
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
    const poolType = String(body?.poolType || 'all')
    const rosterSize = body?.rosterSize != null ? Number(body.rosterSize) : undefined
    const slotConfig = Array.isArray(body?.slotConfig) ? body.slotConfig : undefined

    if (slotConfig !== undefined || body?.useSession) {
      const snapshot = await createMockDraftSession(session.user.id, {
        leagueId: leagueId || undefined,
        settings: {
          sport,
          leagueType,
          draftType,
          numTeams,
          rounds,
          timerSeconds,
          aiEnabled,
          scoringFormat,
          leagueId: leagueId || undefined,
          poolType,
          rosterSize,
        },
        slotConfig,
      })
      return NextResponse.json({
        status: 'ok',
        draftId: snapshot.id,
        config: snapshot.settings,
        inviteToken: snapshot.inviteToken,
        inviteLink: snapshot.inviteLink,
        slotConfig: snapshot.slotConfig,
        draftStatus: snapshot.status,
      })
    }

    const metadata = {
      sport,
      leagueType,
      draftType,
      aiEnabled,
      numTeams,
      rounds,
      timerSeconds,
      scoringFormat,
      poolType,
      rosterSize,
      source: body?.source || 'mock-draft-setup',
    }

    const created = await prisma.mockDraft.create({
      data: {
        leagueId: leagueId || undefined,
        userId: session.user.id,
        rounds,
        results: [],
        proposals: [],
        status: 'pre_draft',
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

