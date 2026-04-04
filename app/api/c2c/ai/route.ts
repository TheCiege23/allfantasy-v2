import { NextRequest, NextResponse } from 'next/server'
import { assertLeagueMember } from '@/lib/league/league-access'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import {
  getC2CSetupRecommendation,
  evaluateCampusPlayer,
  getCampusRankings,
  getBreakoutCampusAlerts,
  getRosterBalanceAnalysis,
  getShouldITransitionAnalysis,
  getDraftAdvice,
  handleC2CCommissionerQuery,
  generateC2CConstitution,
  generateWeeklyC2CRecap,
} from '@/lib/c2c/ai/c2cChimmy'
import { prisma } from '@/lib/prisma'
import type { C2CPlayerState } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof NextResponse) return gate
  const userId = gate

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''

  if (action !== 'setup_rec' && leagueId) {
    const g = await assertLeagueMember(leagueId, userId)
    if (!g.ok) return NextResponse.json({ error: 'Forbidden' }, { status: g.status })
  }

  try {
    switch (action) {
      case 'setup_rec': {
        const sportPair = typeof body.sportPair === 'string' ? body.sportPair : 'NFL_CFB'
        const teamCount = typeof body.teamCount === 'number' ? body.teamCount : 12
        const experience = typeof body.experience === 'string' ? body.experience : 'mixed'
        const rec = await getC2CSetupRecommendation(sportPair, teamCount, experience)
        return NextResponse.json({ rec })
      }
      case 'campus_eval': {
        const managerId = typeof body.managerId === 'string' ? body.managerId : userId
        const playerId = typeof body.playerId === 'string' ? body.playerId : ''
        if (!leagueId || !playerId) return NextResponse.json({ error: 'leagueId and playerId required' }, { status: 400 })
        const ev = await evaluateCampusPlayer(leagueId, managerId, playerId)
        return NextResponse.json({ eval: ev })
      }
      case 'campus_rankings': {
        const position = typeof body.position === 'string' ? body.position : undefined
        const sportPair = typeof body.sportPair === 'string' ? body.sportPair : undefined
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const list = await getCampusRankings(leagueId, position, sportPair)
        return NextResponse.json({ rankings: list })
      }
      case 'breakout_alerts': {
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const alerts = await getBreakoutCampusAlerts(leagueId)
        return NextResponse.json({ alerts })
      }
      case 'roster_balance': {
        const managerId = typeof body.managerId === 'string' ? body.managerId : userId
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const report = await getRosterBalanceAnalysis(leagueId, managerId)
        return NextResponse.json({ report })
      }
      case 'transition_advice': {
        const managerId = typeof body.managerId === 'string' ? body.managerId : userId
        const playerId = typeof body.playerId === 'string' ? body.playerId : ''
        if (!leagueId || !playerId) return NextResponse.json({ error: 'leagueId and playerId required' }, { status: 400 })
        const t = await getShouldITransitionAnalysis(leagueId, managerId, playerId)
        return NextResponse.json({ transition: t })
      }
      case 'draft_advice': {
        const managerId = typeof body.managerId === 'string' ? body.managerId : userId
        const draftType = typeof body.draftType === 'string' ? body.draftType : 'combined'
        const pickNumber = typeof body.pickNumber === 'number' ? body.pickNumber : 1
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const rosterId =
          typeof body.rosterId === 'string'
            ? body.rosterId
            : (
                await prisma.redraftRoster.findFirst({
                  where: { leagueId, ownerId: managerId },
                  select: { id: true },
                })
              )?.id
        const states: C2CPlayerState[] = rosterId
          ? await prisma.c2CPlayerState.findMany({ where: { leagueId, rosterId } })
          : []
        const advice = await getDraftAdvice(leagueId, managerId, draftType, pickNumber, states)
        return NextResponse.json({ advice })
      }
      case 'commissioner_chat': {
        const msg = typeof body.message === 'string' ? body.message : ''
        if (!leagueId || !msg.trim()) return NextResponse.json({ error: 'leagueId and message required' }, { status: 400 })
        const r = await handleC2CCommissionerQuery(leagueId, msg)
        return NextResponse.json(r)
      }
      case 'constitution': {
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const text = await generateC2CConstitution(leagueId)
        return NextResponse.json({ constitution: text })
      }
      case 'weekly_recap': {
        const week = typeof body.week === 'number' ? body.week : 1
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const recap = await generateWeeklyC2CRecap(leagueId, week)
        return NextResponse.json({ recap })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
