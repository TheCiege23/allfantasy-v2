import 'server-only'

import { getLeagueContext } from '@/lib/league-context/leagueContextService'
import { getSeasonStatsBoard, scoreStatLine } from '@/lib/sports-data/sleeperMarketService'
import { getMarketValues } from '@/lib/trade-intel/marketValueService'
import type { GradedTrade } from '@/lib/trade-intel/sleeperTradeGradeService'
import { buildTradeExpectation, type TradeExpectation } from '@/lib/trade-intel/tradeExpectation'

/**
 * I/O half of tradeExpectation. Everything it gathers is real:
 *  - league + scoring settings from the league itself
 *  - market values already parameterized by superflex/teams/PPR/dynasty
 *  - last completed season's ACTUAL stat lines, rescored with this league's weights
 *  - current rosters, for whether required starting slots can be filled
 *
 * Every fetch is individually optional. A failure removes one input and is
 * named in `missing`; it never fabricates a number and never throws the email.
 */

const SLEEPER = 'https://api.sleeper.app/v1'

type WireRoster = { roster_id: number; players?: string[] | null }

async function fetchRosters(sleeperLeagueId: string): Promise<WireRoster[] | null> {
  try {
    const res = await fetch(`${SLEEPER}/league/${sleeperLeagueId}/rosters`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as WireRoster[]
  } catch {
    return null
  }
}

/** The season before the trade's — the last one that actually happened. */
function priorSeasonOf(trade: GradedTrade): string {
  const n = Number(trade.season)
  return Number.isFinite(n) ? String(n - 1) : trade.season
}

export async function loadTradeExpectation(
  sleeperLeagueId: string,
  trade: GradedTrade,
): Promise<TradeExpectation | null> {
  const context = await getLeagueContext(sleeperLeagueId).catch(() => null)
  if (!context) return null

  const priorSeason = priorSeasonOf(trade)

  const [marketValues, statsBoard, rosters] = await Promise.all([
    getMarketValues(context).catch(() => null),
    getSeasonStatsBoard(priorSeason, true).catch(() => null),
    fetchRosters(sleeperLeagueId),
  ])

  // Rescore last season with the league's own weights. scoreStatLine reports
  // whether it truly used them or fell back to a format approximation, and we
  // pass that straight through rather than implying league accuracy we lack.
  let prior: Parameters<typeof buildTradeExpectation>[0]['priorSeason'] = null
  if (statsBoard) {
    const byPlayerId: Record<string, { points: number; games: number | null }> = {}
    let leagueScored = 0
    let total = 0
    for (const [playerId, row] of Object.entries(statsBoard.players)) {
      const scored = scoreStatLine(row.stats, context.scoring.settings, context.scoring.format)
      const games = typeof row.stats.gp === 'number' ? row.stats.gp : null
      byPlayerId[playerId] = { points: scored.points, games }
      total += 1
      if (scored.mode === 'league-scored') leagueScored += 1
    }
    prior = {
      season: statsBoard.season,
      // Only claim league-scored when the clear majority genuinely was.
      mode: total > 0 && leagueScored / total >= 0.8 ? 'league-scored' : 'format-approx',
      byPlayerId,
    }
  }

  // Roster composition by position, as rosters stand now.
  //
  // Positions come from the stat board, which only contains players who
  // actually recorded stats — a rookie or a fringe body is invisible there. An
  // unseen player would silently read as a missing starter, so any roster we
  // cannot mostly identify is dropped rather than reported wrong. "We didn't
  // check" beats "you have no QB" when he is simply a rookie.
  let rosteredByPosition: Record<number, Record<string, number>> | null = null
  if (rosters && statsBoard) {
    rosteredByPosition = {}
    for (const roster of rosters) {
      const ids = roster.players ?? []
      const counts: Record<string, number> = {}
      let identified = 0
      for (const playerId of ids) {
        const position = statsBoard.players[playerId]?.position
        if (!position) continue
        counts[position] = (counts[position] ?? 0) + 1
        identified += 1
      }
      if (ids.length === 0 || identified / ids.length < 0.8) continue
      rosteredByPosition[roster.roster_id] = counts
    }
    if (Object.keys(rosteredByPosition).length === 0) rosteredByPosition = null
  }

  return buildTradeExpectation({
    trade,
    context,
    marketValues,
    priorSeason: prior,
    rosteredByPosition,
    pickValueLookup: (season, round) =>
      marketValues?.pickByRound[`${season}:${round}`] ?? null,
  })
}
