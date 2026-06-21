/**
 * T3 — AllFantasy trade-market event ledger (server-only, deterministic).
 *
 * Best-effort, idempotent capture of normalized trade-market lifecycle events. NO external/LLM calls,
 * NO value mutation — this only WRITES the ledger. Trade lifecycle must never break if capture fails;
 * failures are logged and swallowed.
 *
 * Privacy: only internal user ids are stored (never email/token/session). Payload carries roster/team
 * ids, asset references, captured value summary, and team-profile stance.
 */

import { prisma } from '@/lib/prisma'
import { buildTeamProfile } from '@/lib/trade-value/teamProfile'
import type { TeamProfile } from '@/lib/trade-value/types'

export const REDRAFT_MARKET_EVENT_TYPES = [
  'proposal_created',
  'value_snapshot_created',
  'proposal_accepted',
  'trade_processed',
  'proposal_rejected',
  'proposal_canceled',
  'commissioner_approved',
  'commissioner_vetoed',
  'league_vote_cast',
  'proposal_vetoed',
  'proposal_expired',
  'trade_failed',
] as const

export type RedraftMarketEventType = (typeof REDRAFT_MARKET_EVENT_TYPES)[number]

type AssetRow = {
  fromRosterId: string
  toRosterId: string
  assetType: string
  playerId: string | null
  playerName: string | null
  pickSeason: number | null
  pickRound: number | null
  metadata: unknown
}

function faabAmount(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const amt = Number((metadata as Record<string, unknown>).amount ?? 0)
  return Number.isFinite(amt) && amt > 0 ? amt : 0
}

export function marketEventIdempotencyKey(
  tradeProposalId: string,
  eventType: RedraftMarketEventType,
  suffix?: string | null,
): string {
  return `${tradeProposalId}:${eventType}${suffix ? `:${suffix}` : ''}`
}

export function summarizeAssets(assets: AssetRow[]) {
  const playerAssetIds: string[] = []
  const pickAssets: Array<{ season: number | null; round: number | null }> = []
  let faab = 0
  const normalized = assets.map((a) => {
    if (a.assetType === 'player' && a.playerId) playerAssetIds.push(a.playerId)
    if (a.assetType === 'draft_pick') pickAssets.push({ season: a.pickSeason, round: a.pickRound })
    if (a.assetType === 'faab') faab += faabAmount(a.metadata)
    return {
      kind: a.assetType,
      fromRosterId: a.fromRosterId,
      toRosterId: a.toRosterId,
      playerId: a.playerId,
      pickSeason: a.pickSeason,
      pickRound: a.pickRound,
      faabAmount: a.assetType === 'faab' ? faabAmount(a.metadata) : null,
    }
  })
  return { normalized, playerAssetIds, pickAssets, faabAmount: faab }
}

async function profileFor(rosterId: string, leagueSize: number): Promise<TeamProfile | undefined> {
  const r = await prisma.redraftRoster.findUnique({
    where: { id: rosterId },
    select: {
      id: true, wins: true, losses: true, ties: true, pointsFor: true, playoffSeed: true,
      players: { where: { droppedAt: null }, select: { position: true } },
    },
  })
  if (!r) return undefined
  return buildTeamProfile({
    rosterId: r.id, wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor,
    playoffSeed: r.playoffSeed, leagueSize, positions: r.players.map((p) => p.position),
  })
}

/** Pure, deterministic, privacy-safe payload composition (no DB, no PII). */
export function composeMarketEventPayload(params: {
  proposal: { status: string; proposerRosterId: string; receiverRosterId: string; vetoMode: string; vetoThreshold: number | null }
  season: { sport: string; season: number; currentWeek: number } | null
  league: { scoring: string | null; tradeReviewHours: number | null } | null
  teamCount: number
  assets: ReturnType<typeof summarizeAssets>
  snapshot: { grade: string; fairnessScore: number; confidenceScore: number; valueDifference: number } | null
  sideTotals: Array<{ rosterId: string; total: number }> | null
  proposerProfile?: TeamProfile | null
  receiverProfile?: TeamProfile | null
  voteDirection?: 'approve' | 'veto' | null
  voteCounts?: { approve: number; veto: number; threshold: number } | null
}) {
  return {
    context: {
      sport: params.season?.sport ?? null,
      leagueType: 'redraft',
      scoring: params.league?.scoring ?? null,
      rosterFormat: 'standard',
      teamCount: params.teamCount,
      currentWeek: params.season?.currentWeek ?? null,
      seasonYear: params.season?.season ?? null,
    },
    state: {
      status: params.proposal.status,
      proposerRosterId: params.proposal.proposerRosterId,
      receiverRosterId: params.proposal.receiverRosterId,
      vetoMode: params.proposal.vetoMode,
      vetoThreshold: params.proposal.vetoThreshold,
      reviewHours: params.league?.tradeReviewHours ?? null,
      voteDirection: params.voteDirection ?? null,
      voteCounts: params.voteCounts ?? null,
    },
    assets: {
      summary: params.assets.normalized,
      playerAssetIds: params.assets.playerAssetIds,
      pickAssets: params.assets.pickAssets,
      faabAmount: params.assets.faabAmount,
      sideTotals: params.sideTotals,
    },
    snapshot: params.snapshot,
    profiles: { proposer: params.proposerProfile ?? null, receiver: params.receiverProfile ?? null },
  }
}

export interface RecordMarketEventInput {
  leagueId: string
  seasonId: string
  tradeProposalId: string
  eventType: RedraftMarketEventType
  actorUserId?: string | null
  /** Appended to the idempotency key (e.g. a voter roster id for league_vote_cast). */
  idempotencySuffix?: string | null
  voteDirection?: 'approve' | 'veto' | null
  voteCounts?: { approve: number; veto: number; threshold: number } | null
}

/**
 * Capture one normalized market event. Idempotent: a duplicate (proposal,eventType[,suffix]) is a
 * no-op. Never throws — call it best-effort AFTER the core lifecycle action has succeeded.
 */
export async function recordRedraftTradeMarketEvent(input: RecordMarketEventInput): Promise<void> {
  try {
    const idempotencyKey = marketEventIdempotencyKey(input.tradeProposalId, input.eventType, input.idempotencySuffix)

    const [proposal, season, teamCount] = await Promise.all([
      prisma.redraftTradeProposal.findUnique({
        where: { id: input.tradeProposalId },
        include: { assets: true, valueSnapshot: true },
      }),
      prisma.redraftSeason.findUnique({ where: { id: input.seasonId }, select: { sport: true, season: true, currentWeek: true } }),
      prisma.redraftRoster.count({ where: { seasonId: input.seasonId } }),
    ])
    if (!proposal) return

    const league = await prisma.league.findUnique({
      where: { id: input.leagueId },
      select: { scoring: true, tradeReviewHours: true },
    })

    const leagueSize = teamCount || 12
    const [proposerProfile, receiverProfile] = await Promise.all([
      profileFor(proposal.proposerRosterId, leagueSize),
      profileFor(proposal.receiverRosterId, leagueSize),
    ])

    const assets = summarizeAssets(proposal.assets as AssetRow[])
    const snap = proposal.valueSnapshot
    const snapPayload = (snap?.payload ?? null) as { sides?: Array<{ rosterId: string; total: number }> } | null
    const sideTotals = snapPayload?.sides?.map((s) => ({ rosterId: s.rosterId, total: s.total })) ?? null

    const payload = composeMarketEventPayload({
      proposal,
      season,
      league,
      teamCount: leagueSize,
      assets,
      snapshot: snap
        ? { grade: snap.grade, fairnessScore: snap.fairnessScore, confidenceScore: snap.confidenceScore, valueDifference: snap.valueDifference }
        : null,
      sideTotals,
      proposerProfile,
      receiverProfile,
      voteDirection: input.voteDirection ?? null,
      voteCounts: input.voteCounts ?? null,
    })

    await prisma.redraftTradeMarketEvent.create({
      data: {
        leagueId: input.leagueId,
        seasonId: input.seasonId,
        tradeProposalId: input.tradeProposalId,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        idempotencyKey,
        statusAtEvent: proposal.status,
        sport: season?.sport ?? null,
        grade: snap?.grade ?? null,
        fairnessScore: snap?.fairnessScore ?? null,
        confidenceScore: snap?.confidenceScore ?? null,
        payload: payload as unknown as object,
      },
    })
  } catch (e) {
    // Unique-violation = idempotent no-op; anything else is logged but never breaks the lifecycle.
    const code = (e as { code?: string } | null)?.code
    if (code === 'P2002') return
    console.error('[trade-market] event capture failed', { eventType: input.eventType, proposalId: input.tradeProposalId, error: e })
  }
}
