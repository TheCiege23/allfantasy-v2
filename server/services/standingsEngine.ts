/**
 * Aggregate season standings from `team_week_results` (deterministic).
 * Tie order from `scoringSettings.rules.standingsTiebreakerOrder` when present.
 */
import { prisma } from '@/lib/prisma'
import { parseSettingsSnapshot } from '@/lib/league-contract/types'
import {
  getStandingsTiebreakerOrder,
  type StandingsTiebreakerKey,
} from '@/lib/scoring-engine/scoringSettingsResolved'

type Agg = { rosterId: string; w: number; l: number; t: number; pf: number; pa: number }

function compareAgg(a: Agg, b: Agg, order: StandingsTiebreakerKey[]): number {
  for (const key of order) {
    if (key === 'wins') {
      if (b.w !== a.w) return b.w - a.w
      continue
    }
    if (key === 'pointsFor') {
      if (b.pf !== a.pf) return b.pf - a.pf
      continue
    }
    if (key === 'pointsAgainst') {
      if (a.pa !== b.pa) return a.pa - b.pa
      continue
    }
    if (key === 'rosterId') {
      if (a.rosterId !== b.rosterId) return a.rosterId.localeCompare(b.rosterId)
    }
  }
  return a.rosterId.localeCompare(b.rosterId)
}

export async function recomputeStandingsForSeason(leagueId: string, season: number): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const snap = parseSettingsSnapshot(league?.settings ?? null)
  const scoringSettings = (snap?.scoringSettings ?? null) as Record<string, unknown> | null
  const tieOrder = getStandingsTiebreakerOrder(scoringSettings)

  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const rosterIds = new Set(rosters.map((r) => r.id))

  const results = await prisma.teamWeekResult.findMany({
    where: { leagueId, season, status: 'final' },
  })

  const aggMap = new Map<string, Agg>()
  for (const id of rosterIds) {
    aggMap.set(id, { rosterId: id, w: 0, l: 0, t: 0, pf: 0, pa: 0 })
  }

  for (const tr of results) {
    const row = aggMap.get(tr.rosterId)
    if (!row) continue
    row.pf += Number(tr.totalPoints) || 0
    const oppId = tr.opponentRosterId
    if (oppId && rosterIds.has(oppId)) {
      const oppRow = results.find(
        (x) => x.rosterId === oppId && x.week === tr.week,
      )
      row.pa += oppRow ? Number(oppRow.totalPoints) || 0 : 0
    }
    const wl = tr.winLoss
    if (wl === 'W') row.w += 1
    else if (wl === 'L') row.l += 1
    else if (wl === 'T') row.t += 1
  }

  const sorted = [...aggMap.values()].sort((x, y) => compareAgg(x, y, tieOrder))

  let rank = 1
  for (const s of sorted) {
    await prisma.fantasyStanding.upsert({
      where: {
        leagueId_season_rosterId: { leagueId, season, rosterId: s.rosterId },
      },
      create: {
        leagueId,
        season,
        rosterId: s.rosterId,
        wins: s.w,
        losses: s.l,
        ties: s.t,
        pointsFor: s.pf,
        pointsAgainst: s.pa,
        rank,
      },
      update: {
        wins: s.w,
        losses: s.l,
        ties: s.t,
        pointsFor: s.pf,
        pointsAgainst: s.pa,
        rank,
      },
    })
    rank += 1
  }

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    select: { id: true, platformUserId: true },
  })
  const rosterByPlatform = new Map(
    (
      await prisma.roster.findMany({
        where: { leagueId },
        select: { id: true, platformUserId: true },
      })
    ).map((r) => [r.platformUserId, r.id]),
  )
  for (const t of teams) {
    const rid = rosterByPlatform.get(t.platformUserId ?? '')
    if (!rid) continue
    const st = aggMap.get(rid)
    if (!st) continue
    await prisma.leagueTeam
      .update({
        where: { id: t.id },
        data: {
          wins: st.w,
          losses: st.l,
          ties: st.t,
          pointsFor: st.pf,
          pointsAgainst: st.pa,
        },
      })
      .catch(() => {})
  }
}
