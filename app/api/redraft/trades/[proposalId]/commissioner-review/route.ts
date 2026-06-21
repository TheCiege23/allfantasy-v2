import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { buildTeamProfile } from '@/lib/trade-value/teamProfile'
import type { TeamProfile } from '@/lib/trade-value/types'
import { summarizeMarketContext, type MarketEventLite } from '@/lib/trade-review/marketContext'
import { buildCommissionerTradeReview, type ReviewAsset } from '@/lib/trade-review/redraftCommissionerTradeReview'

export const dynamic = 'force-dynamic'

async function isCommissionerOrOwner(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      userId: true,
      teams: { where: { claimedByUserId: userId }, select: { isCommissioner: true, isCoCommissioner: true } },
    },
  })
  if (!league) return false
  if (league.userId === userId) return true
  return league.teams.some((t) => t.isCommissioner || t.isCoCommissioner)
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

async function profileFor(rosterId: string, seasonId: string, leagueSize: number): Promise<TeamProfile | undefined> {
  const r = await prisma.redraftRoster.findUnique({
    where: { id: rosterId },
    select: { id: true, wins: true, losses: true, ties: true, pointsFor: true, playoffSeed: true, players: { where: { droppedAt: null }, select: { position: true } } },
  })
  if (!r) return undefined
  return buildTeamProfile({ rosterId: r.id, wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor, playoffSeed: r.playoffSeed, leagueSize, positions: r.players.map((p) => p.position) })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ proposalId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId } = await ctx.params
  const proposal = await prisma.redraftTradeProposal.findUnique({
    where: { id: proposalId },
    include: { assets: true, valueSnapshot: true },
  })
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const gate = await assertLeagueMember(proposal.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
  if (!(await isCommissionerOrOwner(proposal.leagueId, userId))) {
    return NextResponse.json({ error: 'Commissioner or co-commissioner permission required' }, { status: 403 })
  }

  const [season, league, teamCount] = await Promise.all([
    prisma.redraftSeason.findUnique({ where: { id: proposal.seasonId }, select: { sport: true, season: true, currentWeek: true } }),
    prisma.league.findUnique({ where: { id: proposal.leagueId }, select: { scoring: true, tradeReviewHours: true, tradeDeadlineWeek: true, draftPickTrading: true } }),
    prisma.redraftRoster.count({ where: { seasonId: proposal.seasonId } }),
  ])
  const leagueSize = teamCount || 12
  const [proposerProfile, receiverProfile] = await Promise.all([
    profileFor(proposal.proposerRosterId, proposal.seasonId, leagueSize),
    profileFor(proposal.receiverRosterId, proposal.seasonId, leagueSize),
  ])

  // Market context (league + sport scoped) + this proposal's event trail.
  const [leagueEvents, proposalEvents] = await Promise.all([
    prisma.redraftTradeMarketEvent.findMany({
      where: { leagueId: proposal.leagueId, ...(season?.sport ? { sport: season.sport } : {}) },
      select: { eventType: true, fairnessScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.redraftTradeMarketEvent.findMany({
      where: { tradeProposalId: proposalId },
      select: { eventType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const assets: ReviewAsset[] = proposal.assets.map((a) => {
    const md = (a.metadata ?? {}) as Record<string, unknown>
    return {
      kind: a.assetType,
      fromRosterId: a.fromRosterId,
      toRosterId: a.toRosterId,
      position: typeof md.position === 'string' ? md.position : null,
      faabAmount: a.assetType === 'faab' ? num(md.amount) : null,
    }
  })

  const snapPayload = (proposal.valueSnapshot?.payload ?? null) as { sides?: Array<{ rosterId: string; total: number }> } | null
  const snapshot = proposal.valueSnapshot
    ? {
        grade: proposal.valueSnapshot.grade,
        fairnessScore: proposal.valueSnapshot.fairnessScore,
        confidenceScore: proposal.valueSnapshot.confidenceScore,
        valueDifference: proposal.valueSnapshot.valueDifference,
        sideTotals: snapPayload?.sides?.map((s) => ({ rosterId: s.rosterId, total: s.total })) ?? [],
      }
    : null

  const marketContext = summarizeMarketContext(leagueEvents as MarketEventLite[])

  const review = buildCommissionerTradeReview({
    proposerRosterId: proposal.proposerRosterId,
    receiverRosterId: proposal.receiverRosterId,
    status: proposal.status,
    vetoMode: proposal.vetoMode,
    vetoThreshold: proposal.vetoThreshold,
    sport: season?.sport ?? 'NFL',
    currentWeek: season?.currentWeek ?? null,
    settings: {
      tradeReviewHours: league?.tradeReviewHours ?? null,
      tradeDeadlineWeek: league?.tradeDeadlineWeek ?? null,
      draftPickTrading: league?.draftPickTrading ?? false,
    },
    snapshot,
    assets,
    proposerProfile,
    receiverProfile,
    hasMarketEvents: proposalEvents.length > 0,
    marketContext,
  })

  return NextResponse.json({
    review,
    snapshotSummary: snapshot
      ? { grade: snapshot.grade, fairnessScore: snapshot.fairnessScore, confidenceScore: snapshot.confidenceScore, valueDifference: snapshot.valueDifference, sideTotals: snapshot.sideTotals }
      : null,
    eventTrail: proposalEvents.map((e) => ({ eventType: e.eventType, createdAt: e.createdAt })),
    settings: {
      vetoMode: proposal.vetoMode,
      vetoThreshold: proposal.vetoThreshold,
      reviewHours: league?.tradeReviewHours ?? null,
      tradeDeadlineWeek: league?.tradeDeadlineWeek ?? null,
      draftPickTrading: league?.draftPickTrading ?? false,
    },
  })
}
