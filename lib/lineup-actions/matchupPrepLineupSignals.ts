import 'server-only'

import { prisma } from '@/lib/prisma'
import { runMatchupPrepDashboard } from '@/lib/matchup-prep-dashboard'
import type { LineupActionItem } from '@/lib/lineup-actions/types'
import type { LineupsActionThresholds } from '@/lib/lineup-actions/thresholds'

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim()?.toLowerCase()
  if (!raw) return fallback
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return fallback
}

/**
 * Deterministic Today Actions rows from live Matchup Prep (no invented stats).
 * Disabled via LINEUP_ACTION_MATCHUP_PREP_SIGNALS=0 or max leagues = 0.
 */
export async function fetchMatchupPrepLineupSignalsForUser(
  userId: string,
  _thresholds: LineupsActionThresholds,
): Promise<LineupActionItem[]> {
  if (!envBool('LINEUP_ACTION_MATCHUP_PREP_SIGNALS', false)) return []

  const maxLeagues = envInt('LINEUP_ACTION_MATCHUP_PREP_MAX_LEAGUES', 4)
  if (maxLeagues === 0) return []

  const leagues = await prisma.league.findMany({
    where: {
      OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      platform: true,
    },
    take: 24,
  })

  const out: LineupActionItem[] = []

  for (const lg of leagues.slice(0, maxLeagues)) {
    const prep = await runMatchupPrepDashboard({
      userId,
      sportFilter: 'ALL',
      leagueId: lg.id,
      teamFocus: 'my_team',
      teamExternalId: null,
      opponentExternalId: null,
      timeHorizon: 'this_matchup',
      strategyMode: 'balanced',
      toggles: {
        includeLiveNews: true,
        includeInjuries: true,
        includeScheduleAdjustments: true,
        includeWeather: true,
        includeStreamingRecommendations: true,
        includeOpponentTrendAnalysis: true,
        includePlayoffContext: true,
        includeRookieProspectContext: false,
      },
      skipAi: true,
    })

    if (!prep.ok) continue
    if (prep.degraded && prep.winProbability == null && prep.projectedEdge == null) continue

    const edge = prep.projectedEdge
    const win = prep.winProbability
    const underdog =
      (edge != null && edge <= -4) ||
      (win != null && win <= 42) ||
      prep.matchupDifficulty === 'tough'
    const closeGame =
      edge != null && Math.abs(edge) <= 2.5 && prep.oppProjectedTotal != null && prep.myProjectedTotal != null

    if (!underdog && !closeGame) continue

    const urgency: LineupActionItem['urgency'] = underdog ? 'urgent' : 'soon'
    const severity: LineupActionItem['severity'] = underdog ? 'warning' : 'info'
    const msg = underdog
      ? `Matchup prep: projected behind — edge ${edge?.toFixed(1) ?? 'n/a'} pts${win != null ? ` · win ~${win}%` : ''}.`
      : `Matchup prep: toss-up — edge ${edge?.toFixed(1) ?? 'n/a'} pts (review starts).`

    out.push({
      leagueId: lg.id,
      leagueName: lg.name ?? 'League',
      sport: lg.sport,
      platform: lg.platform,
      teamId: null,
      slotIndex: null,
      slotId: null,
      slotLabel: null,
      playerId: null,
      playerName: null,
      reasonType: 'matchup_prep',
      urgency,
      lockTime: null,
      recommendedAction: 'Open Matchup Prep for slot edges and Start/Sit-linked game plan.',
      suggestedReplacementPlayerId: null,
      confidence: prep.confidence,
      expectedGain: edge != null ? Math.abs(edge) : null,
      sourceModule: 'MatchupPrep',
      message: msg,
      severity,
    })
  }

  return out
}
