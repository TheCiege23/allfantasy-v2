/**
 * RecordDetector — detect record candidates from SeasonResult, DraftGrade, WaiverClaim.
 */

import { prisma } from '@/lib/prisma'
import { buildSeasonResultManagerMap } from '@/lib/season-results/SeasonResultRosterIdentity'
import type { RecordCandidate, RecordType } from './types'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

/**
 * Detect record candidates for a league+season. Returns one candidate per record type (best in that season).
 * For most_championships, pass season "all" to compute all-time league leader.
 */
export async function detectRecords(
  leagueId: string,
  season: string,
  options?: { sport?: string | null }
): Promise<RecordCandidate[]> {
  const sport = options?.sport ?? DEFAULT_SPORT

  const [league, rosters, seasonResults, draftGrades, waiverByRoster] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { sport: true } }),
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, leagueId: true, platformUserId: true, playerData: true },
    }),
    prisma.seasonResult.findMany({
      where: season === 'all' ? { leagueId } : { leagueId, season },
      select: { rosterId: true, season: true, wins: true, pointsFor: true, pointsAgainst: true, champion: true },
    }),
    season === 'all'
      ? []
      : prisma.draftGrade.findMany({
          where: { leagueId, season },
          select: { rosterId: true, score: true },
        }),
    prisma.waiverClaim.groupBy({
      by: ['rosterId'],
      where: { leagueId },
      _count: { id: true },
    }),
  ])

  const resolvedSport = (league?.sport ?? sport) as string
  const rosterToManager = buildSeasonResultManagerMap(rosters)

  function holder(rosterId: string): string {
    return rosterToManager.get(rosterId) ?? rosterId
  }

  const candidates: RecordCandidate[] = []

  if (season === 'all') {
    const champsByHolder = new Map<string, number>()
    const countedChampionships = new Set<string>()
    for (const sr of seasonResults) {
      if (!sr.champion) continue
      const h = holder(sr.rosterId)
      const key = `${h}:${sr.season}`
      if (countedChampionships.has(key)) continue
      countedChampionships.add(key)
      champsByHolder.set(h, (champsByHolder.get(h) ?? 0) + 1)
    }
    let bestHolder = ''
    let bestCount = 0
    for (const [h, count] of champsByHolder) {
      if (count > bestCount) {
        bestCount = count
        bestHolder = h
      }
    }
    if (bestHolder && bestCount > 0) {
      candidates.push({
        recordType: 'most_championships',
        holderId: bestHolder,
        value: bestCount,
        season: 'all',
        context: `${bestCount} championships`,
      })
    }
    return candidates
  }

  const srByHolder = new Map<
    string,
    { wins: number; pointsFor: number; pointsAgainst: number }
  >()
  for (const sr of seasonResults) {
    const h = holder(sr.rosterId)
    const cur = srByHolder.get(h) ?? { wins: 0, pointsFor: 0, pointsAgainst: 0 }
    cur.wins = Math.max(cur.wins, sr.wins ?? 0)
    cur.pointsFor = Math.max(cur.pointsFor, Number(sr.pointsFor ?? 0))
    cur.pointsAgainst = Math.max(cur.pointsAgainst, Number(sr.pointsAgainst ?? 0))
    srByHolder.set(h, cur)
  }

  let bestScoreHolder = ''
  let bestScore = -1
  let bestWinsHolder = ''
  let bestWins = -1
  let bestComebackHolder = ''
  let bestComeback = -Infinity
  for (const [h, m] of srByHolder) {
    if (m.pointsFor > bestScore) {
      bestScore = m.pointsFor
      bestScoreHolder = h
    }
    if (m.wins > bestWins) {
      bestWins = m.wins
      bestWinsHolder = h
    }
    const diff = m.pointsFor - m.pointsAgainst
    if (diff > bestComeback) {
      bestComeback = diff
      bestComebackHolder = h
    }
  }
  if (bestScoreHolder && bestScore >= 0) {
    candidates.push({
      recordType: 'highest_score',
      holderId: bestScoreHolder,
      value: bestScore,
      season,
      context: `${bestScore} PF`,
    })
  }
  if (bestWinsHolder && bestWins >= 0) {
    candidates.push({
      recordType: 'longest_win_streak',
      holderId: bestWinsHolder,
      value: bestWins,
      season,
      context: `${bestWins} wins`,
    })
  }
  if (bestComebackHolder && bestComeback > -Infinity) {
    candidates.push({
      recordType: 'biggest_comeback',
      holderId: bestComebackHolder,
      value: Math.round(bestComeback * 100) / 100,
      season,
      context: `+${bestComeback.toFixed(0)} point diff`,
    })
  }

  const waiverByHolder = new Map<string, number>()
  for (const r of rosters) {
    const count = waiverByRoster.find((w) => w.rosterId === r.id)?._count.id ?? 0
    waiverByHolder.set(r.platformUserId, count)
  }
  let mostWaiverHolder = ''
  let mostWaiver = -1
  for (const [h, count] of waiverByHolder) {
    if (count > mostWaiver) {
      mostWaiver = count
      mostWaiverHolder = h
    }
  }
  if (mostWaiverHolder && mostWaiver > 0) {
    candidates.push({
      recordType: 'most_trades_season',
      holderId: mostWaiverHolder,
      value: mostWaiver,
      season,
      context: `${mostWaiver} waiver claims`,
    })
  }

  let bestDraftHolder = ''
  let bestDraftScore = -1
  for (const d of draftGrades) {
    const n = Number(d.score ?? 0)
    if (n > bestDraftScore) {
      bestDraftScore = n
      bestDraftHolder = holder(d.rosterId)
    }
  }
  if (bestDraftHolder && bestDraftScore >= 0) {
    candidates.push({
      recordType: 'best_draft_class',
      holderId: bestDraftHolder,
      value: bestDraftScore,
      season,
      context: `Draft grade ${bestDraftScore}`,
    })
  }

  return candidates
}
