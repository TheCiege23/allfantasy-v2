/**
 * POST /api/mock-draft/simulate-v2
 * Platform-wide AI mock draft using MockDraftEngine, DraftAIManager, MetaDraftPredictor.
 * Body: leagueId?, sport, numTeams, rounds, draftType, userSlot?, userPicks?, isSuperflex?, isTEP?
 * When leagueId provided and sport is NFL, uses getLiveADP for pool; otherwise pass playerPool in body.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLiveADP } from '@/lib/adp-data'
import { runDraft } from '@/lib/mock-draft-simulator'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { DraftPlayer, MockDraftConfig } from '@/lib/mock-draft-simulator/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const leagueId = body.leagueId ?? null
    const sport = normalizeToSupportedSport(body.sport ?? 'NFL')
    const numTeams = Math.min(Math.max(Number(body.numTeams) || 12, 8), 16)
    const rounds = Math.min(Math.max(Number(body.rounds) || 15, 10), 25)
    const draftType = body.draftType === 'linear' ? 'linear' : 'snake'
    const userSlot = body.userSlot != null ? Math.max(0, Math.min(numTeams - 1, Number(body.userSlot))) : null
    const userPicks = Array.isArray(body.userPicks) ? body.userPicks : []
    const isSuperflex = !!body.isSuperflex
    const isTEP = !!body.isTEP

    let teamNames: string[] = []
    if (leagueId) {
      const league = await prisma.league.findFirst({
        where: { id: leagueId, userId: session.user.id },
        include: {
          teams: {
            select: { teamName: true, ownerName: true },
            take: 20,
          },
        },
      })
      if (league?.teams?.length) {
        teamNames = league.teams.map((t) => t.teamName || t.ownerName || 'Team').slice(0, numTeams)
      }
    }
    if (teamNames.length < numTeams) {
      teamNames = [...teamNames, ...Array.from({ length: numTeams - teamNames.length }, (_, i) => `Team ${teamNames.length + i + 1}`)]
    }

    let playerPool: DraftPlayer[] = []
    if (body.playerPool && Array.isArray(body.playerPool)) {
      playerPool = body.playerPool.map((p: any) => ({
        name: p.name ?? p.playerName ?? '',
        position: p.position ?? 'WR',
        team: p.team ?? null,
        adp: p.adp ?? null,
        value: p.value ?? null,
        playerId: p.playerId ?? null,
      })).filter((p: DraftPlayer) => p.name)
    }
    if (playerPool.length === 0 && (sport === 'NFL' || !body.playerPool)) {
      const adpType = body.isDynasty ? 'dynasty' : 'redraft'
      const adpEntries = await getLiveADP(adpType as 'dynasty' | 'redraft', numTeams * rounds + 50)
      playerPool = adpEntries.map((p) => ({
        name: p.name,
        position: p.position,
        team: p.team ?? null,
        adp: p.adp ?? null,
        value: p.value ?? null,
        playerId: null,
      }))
    }

    if (playerPool.length < numTeams * rounds) {
      return NextResponse.json(
        { error: 'Player pool too small for this draft size' },
        { status: 400 }
      )
    }

    const config: MockDraftConfig = {
      sport,
      numTeams,
      rounds,
      draftType,
      teamNames,
      userSlot,
      userPicks,
      isSuperflex,
      isTEP,
    }

    const result = await runDraft({ config, playerPool })

    if (leagueId) {
      try {
        await prisma.mockDraft.create({
          data: {
            leagueId,
            userId: session.user.id,
            rounds,
            results: result.picks,
            metadata: {
              sport,
              draftType,
              numTeams,
              aiEnabled: true,
              simulatorV2: true,
            },
          },
        })
      } catch (e) {
        console.warn('[mock-draft simulate-v2] Save failed:', e)
      }
    }

    return NextResponse.json({
      picks: result.picks,
      config: { sport, numTeams, rounds, draftType, teamNames },
    })
  } catch (e) {
    console.error('[mock-draft simulate-v2]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Draft simulation failed' },
      { status: 500 }
    )
  }
}
