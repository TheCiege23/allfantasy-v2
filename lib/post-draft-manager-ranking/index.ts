/**
 * Post-draft manager ranking (PROMPT 231). Deterministic; no AI required.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

import { prisma } from '@/lib/prisma'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import { computeDraftResults } from './scoringService'
import type { DraftResultsPayload, ManagerRankingEntry } from './types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type { DraftResultsPayload, ManagerRankingEntry, PickScoreEntry } from './types'
export { scoreToLetterGrade, LETTER_GRADES } from './gradeMapper'

/**
 * Compute rankings and grades for a completed draft, then persist to DraftGrade.
 * Call when draft is completed or on first load of draft-results page.
 */
export async function computeAndPersistDraftRankings(leagueId: string): Promise<DraftResultsPayload | null> {
  const snapshot = await buildSessionSnapshot(leagueId)
  if (!snapshot || snapshot.status !== 'completed') return null

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, sport: true, season: true, isDynasty: true, settings: true },
  })
  if (!league) return null

  const sport = normalizeToSupportedSport(league.sport)
  const isDynasty = !!league.isDynasty
  const settings = (league.settings as Record<string, unknown>) ?? {}
  const formatKey = settings.draft_pre_draft_ranking_source
    ? String(settings.draft_pre_draft_ranking_source).toLowerCase()
    : 'default'
  const season = String(league.season ?? new Date().getFullYear())

  const payload = await computeDraftResults({
    leagueId,
    leagueName: league.name ?? null,
    sport,
    draftType: snapshot.draftType ?? 'snake',
    season,
    status: snapshot.status,
    rounds: snapshot.rounds,
    teamCount: snapshot.teamCount,
    slotOrder: snapshot.slotOrder as SlotOrderEntry[],
    picks: snapshot.picks,
    isDynasty,
    formatKey,
  })

  await persistDraftGrades(leagueId, season, payload.managerRankings)
  return payload
}

/**
 * Get draft results. Computes and persists if not already stored (or recomputes for freshness).
 */
export async function getDraftResults(leagueId: string): Promise<DraftResultsPayload | null> {
  return computeAndPersistDraftRankings(leagueId)
}

async function persistDraftGrades(
  leagueId: string,
  season: string,
  rankings: ManagerRankingEntry[]
): Promise<void> {
  await prisma.$transaction(
    rankings.map((r) =>
      prisma.draftGrade.upsert({
        where: {
          uniq_draft_grade_league_season_roster: { leagueId, season, rosterId: r.rosterId },
        },
        create: {
          leagueId,
          season,
          rosterId: r.rosterId,
          grade: r.grade,
          score: r.score,
          breakdown: {
            rank: r.rank,
            displayName: r.displayName,
            slot: r.slot,
            totalValueScore: r.totalValueScore,
            positionalScore: r.positionalScore,
            positionalDepthScore: r.positionalDepthScore,
            benchScore: r.benchScore,
            balanceScore: r.balanceScore,
            upsideScore: r.upsideScore,
            reachPenaltyScore: r.reachPenaltyScore,
            injuryRiskScore: r.injuryRiskScore,
            byeWeekScore: r.byeWeekScore,
            pickCount: r.pickCount,
            explanation: r.explanation ?? null,
            explanationSource: r.explanationSource ?? 'deterministic',
            bestPick: r.bestPick
              ? {
                  playerName: r.bestPick.playerName,
                  position: r.bestPick.position,
                  overall: r.bestPick.overall,
                  adp: r.bestPick.adp,
                  valueScore: r.bestPick.valueScore,
                }
              : null,
            worstReach: r.worstReach
              ? {
                  playerName: r.worstReach.playerName,
                  position: r.worstReach.position,
                  overall: r.worstReach.overall,
                  adp: r.worstReach.adp,
                  valueScore: r.worstReach.valueScore,
                }
              : null,
            picks: r.picks.map((p) => ({
              id: p.id,
              overall: p.overall,
              playerName: p.playerName,
              position: p.position,
              adp: p.adp,
              valueScore: p.valueScore,
            })),
          } as object,
        },
        update: {
          grade: r.grade,
          score: r.score,
          breakdown: {
            rank: r.rank,
            displayName: r.displayName,
            slot: r.slot,
            totalValueScore: r.totalValueScore,
            positionalScore: r.positionalScore,
            positionalDepthScore: r.positionalDepthScore,
            benchScore: r.benchScore,
            balanceScore: r.balanceScore,
            upsideScore: r.upsideScore,
            reachPenaltyScore: r.reachPenaltyScore,
            injuryRiskScore: r.injuryRiskScore,
            byeWeekScore: r.byeWeekScore,
            pickCount: r.pickCount,
            explanation: r.explanation ?? null,
            explanationSource: r.explanationSource ?? 'deterministic',
            bestPick: r.bestPick
              ? {
                  playerName: r.bestPick.playerName,
                  position: r.bestPick.position,
                  overall: r.bestPick.overall,
                  adp: r.bestPick.adp,
                  valueScore: r.bestPick.valueScore,
                }
              : null,
            worstReach: r.worstReach
              ? {
                  playerName: r.worstReach.playerName,
                  position: r.worstReach.position,
                  overall: r.worstReach.overall,
                  adp: r.worstReach.adp,
                  valueScore: r.worstReach.valueScore,
                }
              : null,
            picks: r.picks.map((p) => ({
              id: p.id,
              overall: p.overall,
              playerName: p.playerName,
              position: p.position,
              adp: p.adp,
              valueScore: p.valueScore,
            })),
          } as object,
        },
      })
    )
  )
  return
}
