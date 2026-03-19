/**
 * Deterministic weighted draft lottery engine.
 * Draw without replacement; auditable via seed.
 */

import { prisma } from '@/lib/prisma'
import type {
  WeightedLotteryConfig,
  WeightedLotteryResult,
  LotteryDrawResult,
  LotteryEligibleTeam,
} from './types'
import {
  getStandingsForLottery,
  applyTiebreak,
  selectEligibleTeams,
  buildEligibleTeamsWithOdds,
} from './standingsForLottery'

const DEFAULT_PLAYOFF_TEAM_COUNT = 6

function seededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state << 5) - state + seed.charCodeAt(i)
    state |= 0
  }
  let n = 0
  return () => {
    n++
    const x = Math.sin(((state >>> 0) / 0xffffffff) * 997 + n * 9999) * 10000
    return x - Math.floor(x)
  }
}

/**
 * Run weighted random draw without replacement.
 * Each draw: probability proportional to current weight; then remove winner from pool.
 */
function runWeightedDraw(
  eligible: LotteryEligibleTeam[],
  pickCount: number,
  seed: string
): LotteryDrawResult[] {
  const rng = seededRandom(seed)
  const draws: LotteryDrawResult[] = []
  let pool = eligible.map((e, idx) => ({ ...e, originalOrder: idx + 1 }))

  for (let pick = 1; pick <= pickCount && pool.length > 0; pick++) {
    const totalWeight = pool.reduce((s, t) => s + t.weight, 0)
    if (totalWeight <= 0) break
    let r = rng() * totalWeight
    let chosen = pool[0]
    for (const t of pool) {
      r -= t.weight
      if (r <= 0) {
        chosen = t
        break
      }
      chosen = t
    }
    draws.push({
      pickSlot: pick,
      rosterId: chosen.rosterId,
      displayName: chosen.displayName,
      originalOrder: chosen.originalOrder,
    })
    pool = pool.filter((t) => t.rosterId !== chosen.rosterId)
  }

  return draws
}

/**
 * Get playoff team count from league settings.
 */
async function getPlayoffTeamCount(leagueId: string): Promise<number> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) ?? {}
  const count = settings.playoff_team_count as number | undefined
  return typeof count === 'number' && count >= 0 ? count : DEFAULT_PLAYOFF_TEAM_COUNT
}

/**
 * Build full slot order: lottery picks first, then remaining teams in fallback order.
 */
function buildFullSlotOrder(
  lotteryDraws: LotteryDrawResult[],
  allStandings: { rosterId: string; displayName: string; rank: number }[],
  drawnRosterIds: Set<string>,
  _fallbackOrder: 'reverse_standings' | 'reverse_max_pf'
): { slot: number; rosterId: string; displayName: string }[] {
  const remaining = allStandings.filter((r) => !drawnRosterIds.has(r.rosterId))
  remaining.sort((a, b) => b.rank - a.rank)
  const k = lotteryDraws.length
  const lotterySlots = lotteryDraws.map((d) => ({
    slot: d.pickSlot,
    rosterId: d.rosterId,
    displayName: d.displayName,
  }))
  const fallbackSlots = remaining.map((r, i) => ({
    slot: k + i + 1,
    rosterId: r.rosterId,
    displayName: r.displayName,
  }))
  return [...lotterySlots, ...fallbackSlots].sort((a, b) => a.slot - b.slot)
}

/**
 * Preview: return eligible teams with weights and odds (no draw).
 */
export async function previewLotteryOdds(
  leagueId: string,
  config: WeightedLotteryConfig
): Promise<{
  eligible: LotteryEligibleTeam[]
  playoffTeamCount: number
  message?: string
} | null> {
  const standings = await getStandingsForLottery(leagueId)
  if (standings.length === 0) return null

  const seed = config.randomSeed ?? config.auditSeed ?? `preview-${Date.now()}`
  applyTiebreak(standings, config.tiebreakMode, seed)

  const playoffTeamCount = await getPlayoffTeamCount(leagueId)
  const eligibleRows = selectEligibleTeams(
    standings,
    config.eligibilityMode,
    config.lotteryTeamCount,
    playoffTeamCount
  )
  const eligible = buildEligibleTeamsWithOdds(eligibleRows, config.weightingMode)

  return {
    eligible,
    playoffTeamCount,
    message:
      eligible.length === 0
        ? 'No eligible teams for lottery. Check eligibility mode and lottery team count.'
        : undefined,
  }
}

/**
 * Run the weighted lottery and return result (and optionally full slot order).
 */
export async function runWeightedLottery(
  leagueId: string,
  config: WeightedLotteryConfig,
  seed: string
): Promise<WeightedLotteryResult | null> {
  const standings = await getStandingsForLottery(leagueId)
  if (standings.length === 0) return null

  applyTiebreak(standings, config.tiebreakMode, seed)

  const playoffTeamCount = await getPlayoffTeamCount(leagueId)
  const eligibleRows = selectEligibleTeams(
    standings,
    config.eligibilityMode,
    config.lotteryTeamCount,
    playoffTeamCount
  )
  const eligible = buildEligibleTeamsWithOdds(eligibleRows, config.weightingMode)
  if (eligible.length === 0) return null

  const lotteryPickCount = Math.min(config.lotteryPickCount, eligible.length)
  const lotteryDraws = runWeightedDraw(eligible, lotteryPickCount, seed)
  const drawnRosterIds = new Set(lotteryDraws.map((d) => d.rosterId))

  const allStandingsForFallback = standings.map((r) => ({
    rosterId: r.rosterId,
    displayName: r.displayName,
    rank: r.rank,
  }))
  const fullOrder = buildFullSlotOrder(
    lotteryDraws,
    allStandingsForFallback,
    drawnRosterIds,
    config.fallbackOrder === 'reverse_max_pf' ? 'reverse_standings' : 'reverse_standings'
  )

  const fallbackOrder = fullOrder.filter((e) => e.slot > lotteryPickCount)

  return {
    lotteryDraws,
    fallbackOrder,
    slotOrder: fullOrder,
    seed,
    runAt: new Date().toISOString(),
    configSnapshot: {
      lotteryTeamCount: config.lotteryTeamCount,
      lotteryPickCount: config.lotteryPickCount,
      eligibilityMode: config.eligibilityMode,
      weightingMode: config.weightingMode,
      fallbackOrder: config.fallbackOrder,
      tiebreakMode: config.tiebreakMode,
    },
    oddsSnapshot: eligible.map((e) => ({
      rosterId: e.rosterId,
      weight: e.weight,
      oddsPercent: e.oddsPercent,
    })),
  }
}
