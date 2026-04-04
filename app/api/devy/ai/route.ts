import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { assertLeagueMember } from '@/lib/league/league-access'
import { isCommissioner } from '@/lib/commissioner/permissions'
import {
  assertCommissioner,
  generateAnnualTransitionReport,
  generateImportSummary,
  generateLeagueConstitution,
  getBreakoutAlerts,
  getDraftStrategyAdvice,
  getDevyRankings,
  getPipelineHealthAnalysis,
  getSetupRecommendation,
  getShouldIPromoteAnalysis,
  handleCommissionerQuery,
  suggestPlayerMatches,
  evaluateDevyProspect,
} from '@/lib/devy/ai/devyChimmy'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Body = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (typeof gate !== 'string') return gate
  const userId = gate

  const raw = (await req.json().catch(() => null)) as Body | null
  const body: Body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const action = str(body.action)
  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'setup_recommendation': {
        const teamCount = num(body.teamCount) ?? 12
        const leagueExperience = str(body.experience) || str(body.leagueExperience) || 'mixed'
        const managerFamiliarity = str(body.managerFamiliarity) || 'mixed'
        const data = await getSetupRecommendation(teamCount, leagueExperience, managerFamiliarity)
        return NextResponse.json(data)
      }

      case 'pipeline_health': {
        const leagueId = str(body.leagueId)
        const managerId = str(body.managerId) || userId
        const rosterId = str(body.rosterId)
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        if (managerId !== userId && !(await isCommissioner(leagueId, userId))) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        let rid = rosterId
        if (!rid) {
          const season = await prisma.redraftSeason.findFirst({
            where: { leagueId },
            orderBy: { season: 'desc' },
            select: { id: true },
          })
          if (!season) return NextResponse.json({ error: 'No season' }, { status: 404 })
          const rr = await prisma.redraftRoster.findFirst({
            where: { seasonId: season.id, ownerId: managerId },
            select: { id: true },
          })
          rid = rr?.id ?? ''
        }
        if (!rid) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })
        const data = await getPipelineHealthAnalysis(leagueId, rid)
        return NextResponse.json(data)
      }

      case 'prospect_eval': {
        const leagueId = str(body.leagueId)
        const managerId = str(body.managerId) || userId
        const playerId = str(body.playerId)
        if (!leagueId || !playerId) {
          return NextResponse.json({ error: 'leagueId and playerId required' }, { status: 400 })
        }
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        if (managerId !== userId) {
          return NextResponse.json({ error: 'Can only evaluate for your own roster' }, { status: 403 })
        }
        const season = await prisma.redraftSeason.findFirst({
          where: { leagueId },
          orderBy: { season: 'desc' },
          select: { id: true },
        })
        if (!season) return NextResponse.json({ error: 'No season' }, { status: 404 })
        const rr = await prisma.redraftRoster.findFirst({
          where: { seasonId: season.id, ownerId: managerId },
          select: { id: true },
        })
        if (!rr) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
        const managerRoster = await prisma.devyPlayerState.findMany({
          where: { leagueId, rosterId: rr.id },
        })
        const data = await evaluateDevyProspect(playerId, leagueId, managerRoster)
        return NextResponse.json(data)
      }

      case 'devy_rankings': {
        const leagueId = str(body.leagueId)
        const position = str(body.position) || undefined
        const classFilter = str(body.classFilter) || undefined
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        const data = await getDevyRankings(leagueId, position, classFilter)
        return NextResponse.json(data)
      }

      case 'breakout_alerts': {
        const leagueId = str(body.leagueId)
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        const data = await getBreakoutAlerts(leagueId)
        return NextResponse.json({ data })
      }

      case 'should_promote': {
        const leagueId = str(body.leagueId)
        const managerId = str(body.managerId) || userId
        const playerId = str(body.playerId)
        if (!leagueId || !playerId) {
          return NextResponse.json({ error: 'leagueId and playerId required' }, { status: 400 })
        }
        const mem = await assertLeagueMember(leagueId, userId)
        if (!mem.ok) return NextResponse.json({ error: 'Forbidden' }, { status: mem.status })
        if (managerId !== userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const season = await prisma.redraftSeason.findFirst({
          where: { leagueId },
          orderBy: { season: 'desc' },
          select: { id: true },
        })
        if (!season) return NextResponse.json({ error: 'No season' }, { status: 404 })
        const rr = await prisma.redraftRoster.findFirst({
          where: { seasonId: season.id, ownerId: managerId },
          select: { id: true },
        })
        if (!rr) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
        const data = await getShouldIPromoteAnalysis(leagueId, rr.id, playerId)
        return NextResponse.json(data)
      }

      case 'suggest_matches': {
        const sessionId = str(body.sessionId)
        if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
        if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        const g = await assertLeagueMember(row.leagueId, userId)
        if (!g.ok) return NextResponse.json({ error: 'Forbidden' }, { status: g.status })
        const data = await suggestPlayerMatches(sessionId, [])
        return NextResponse.json({ suggestions: data })
      }

      case 'import_summary': {
        const sessionId = str(body.sessionId)
        if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        const row = await prisma.devyImportSession.findFirst({ where: { id: sessionId } })
        if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        const g = await assertLeagueMember(row.leagueId, userId)
        if (!g.ok) return NextResponse.json({ error: 'Forbidden' }, { status: g.status })
        await assertCommissioner(row.leagueId, userId)
        const data = await generateImportSummary(sessionId)
        return NextResponse.json(data)
      }

      case 'commissioner_chat': {
        const leagueId = str(body.leagueId)
        const message = str(body.message)
        if (!leagueId || !message) {
          return NextResponse.json({ error: 'leagueId and message required' }, { status: 400 })
        }
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        if (!(await isCommissioner(leagueId, userId))) {
          return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })
        }
        const data = await handleCommissionerQuery(leagueId, userId, message)
        return NextResponse.json(data)
      }

      case 'constitution': {
        const leagueId = str(body.leagueId)
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        const text = await generateLeagueConstitution(leagueId)
        return NextResponse.json({ text })
      }

      case 'annual_report': {
        const leagueId = str(body.leagueId)
        const season = num(body.season)
        if (!leagueId || season == null) {
          return NextResponse.json({ error: 'leagueId and season required' }, { status: 400 })
        }
        const m = await assertLeagueMember(leagueId, userId)
        if (!m.ok) return NextResponse.json({ error: 'Forbidden' }, { status: m.status })
        const text = await generateAnnualTransitionReport(leagueId, Math.floor(season))
        return NextResponse.json({ text })
      }

      case 'draft_advice': {
        const leagueId = str(body.leagueId)
        const managerId = str(body.managerId) || userId
        const draftType = str(body.draftType) || 'startup'
        const pick = num(body.pick) ?? num(body.currentPick) ?? 1
        if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
        const mem = await assertLeagueMember(leagueId, userId)
        if (!mem.ok) return NextResponse.json({ error: 'Forbidden' }, { status: mem.status })
        if (managerId !== userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const season = await prisma.redraftSeason.findFirst({
          where: { leagueId },
          orderBy: { season: 'desc' },
          select: { id: true },
        })
        if (!season) return NextResponse.json({ error: 'No season' }, { status: 404 })
        const rr = await prisma.redraftRoster.findFirst({
          where: { seasonId: season.id, ownerId: managerId },
          select: { id: true },
        })
        if (!rr) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
        const rostersState = await prisma.devyPlayerState.findMany({ where: { leagueId, rosterId: rr.id } })
        const data = await getDraftStrategyAdvice(leagueId, managerId, draftType, pick, rostersState)
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    const code = msg.includes('Commissioner') && msg.includes('only') ? 403 : 500
    return NextResponse.json({ error: msg }, { status: code })
  }
}
