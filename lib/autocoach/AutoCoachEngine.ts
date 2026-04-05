// AutoCoach: AI lineup guardian for AF Pro subscribers.
// Runs PREGAME ONLY — once any game in a slate starts, no swaps are made.
// Does NOT apply to Best Ball leagues.

import type { LeagueSport, Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getStarterSlotLabels } from '@/lib/league/rosterSlots'
import {
  buildPlayerDataFromSections,
  getNormalizedLineupSections,
  type RosterSectionKey,
} from '@/lib/roster/LineupTemplateValidation'
import { dispatchNotification } from '@/lib/notifications/NotificationDispatcher'
import { EntitlementResolver } from '@/lib/subscription/EntitlementResolver'
import { isGameSlateStarted, toSlateDateUtc } from '@/lib/autocoach/StatusMonitor'
import type { AutoCoachSwapResult } from '@/lib/autocoach/types'

export const AUTOCOACH_SWAP_STATUSES = new Set([
  'OUT',
  'IR',
  'INJURED_RESERVE',
  'INACTIVE',
  'SCRATCHED',
  'DNP',
  'DL',
  'IL',
  'COVID',
  'SUSPENDED',
  'RULED_OUT',
  'INJURED',
  'PUP',
])

export const BESTBALL_VARIANTS = new Set(['best_ball', 'bestball', 'best-ball'])

export function normalizeStatusToken(status: string): string {
  return status.toUpperCase().replace(/\s+/g, '_')
}

export function isSwapEligibleStatus(status: string): boolean {
  return AUTOCOACH_SWAP_STATUSES.has(normalizeStatusToken(status))
}

export function isBestBallLeague(leagueVariant: string | null | undefined, bestBallMode?: boolean | null): boolean {
  if (bestBallMode === true) return true
  if (!leagueVariant) return false
  const v = leagueVariant.toLowerCase()
  return BESTBALL_VARIANTS.has(v) || v.includes('best_ball') || v.includes('bestball')
}

function leagueSportToPlayerSport(sport: LeagueSport): string {
  return String(sport)
}

function positionFitsSlot(slotLabel: string, playerPos: string): boolean {
  const slot = slotLabel.replace(/[0-9]/g, '').toUpperCase()
  const p = playerPos.toUpperCase()
  if (slot.includes('SUPER') && slot.includes('FLEX')) {
    return ['QB', 'RB', 'WR', 'TE'].includes(p)
  }
  if (slot === 'FLEX' || slot === 'FLX' || (slot.includes('FLEX') && !slot.includes('SUPER'))) {
    return ['RB', 'WR', 'TE'].includes(p)
  }
  if (slot === 'DST' || slot === 'DEF') return p === 'DEF' || p === 'DST'
  return slot === p
}

async function projectionScore(playerId: string, sport: string): Promise<number> {
  const row = await prisma.sportsPlayerRecord.findUnique({
    where: { id: playerId },
    select: { adp: true, projections: true },
  })
  if (row?.adp != null && Number.isFinite(row.adp)) {
    return 1000 - row.adp
  }
  const proj = row?.projections
  if (proj && typeof proj === 'object' && !Array.isArray(proj)) {
    const pts = (proj as Record<string, unknown>).pts ?? (proj as Record<string, unknown>).fantasy_points
    if (typeof pts === 'number' && Number.isFinite(pts)) return pts
  }
  return 0
}

export async function executeAutoCoachSwap(
  rosterId: string,
  userId: string,
  leagueId: string,
  leagueName: string,
  slotPosition: string,
  playerOut: { id: string; name: string; status: string },
  playerIn: { id: string; name: string; position: string },
  statusSource: string,
  gameStartsAt: Date | null,
  detectedAt: Date
): Promise<AutoCoachSwapResult> {
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    select: { playerData: true, leagueId: true },
  })
  if (!roster || roster.leagueId !== leagueId) {
    throw new Error('Roster not found')
  }

  const sections = getNormalizedLineupSections(roster.playerData)
  const si = sections.starters.findIndex((p) => String(p.id) === playerOut.id)
  if (si < 0) {
    throw new Error('Player to remove not in starters')
  }
  const bi = sections.bench.findIndex((p) => String(p.id) === playerIn.id)
  if (bi < 0) {
    throw new Error('Replacement not on bench')
  }

  const next: Record<RosterSectionKey, Array<Record<string, unknown>>> = {
    starters: [...sections.starters],
    bench: [...sections.bench],
    ir: [...sections.ir],
    taxi: [...sections.taxi],
    devy: [...sections.devy],
  }

  const outRow = next.starters[si]!
  const inRow = next.bench[bi]!
  next.starters[si] = { ...inRow, position: String(inRow.position ?? playerIn.position) }
  next.bench[bi] = { ...outRow, position: String(outRow.position ?? playerOut.id) }

  const nextPlayerData = buildPlayerDataFromSections(roster.playerData, next)

  const swapLog = await prisma.autoCoachSwapLog.create({
    data: {
      userId,
      leagueId,
      rosterId,
      slotPosition,
      playerOutId: playerOut.id,
      playerOutName: playerOut.name,
      playerOutStatus: playerOut.status,
      playerInId: playerIn.id,
      playerInName: playerIn.name,
      playerInPosition: playerIn.position,
      statusSource,
      statusDetectedAt: detectedAt,
      gameStartsAt,
      wasPreGame: true,
    },
  })

  await prisma.roster.update({
    where: { id: rosterId },
    data: { playerData: nextPlayerData as object },
  })

  await prisma.autoCoachSetting.update({
    where: { userId_leagueId: { userId, leagueId } },
    data: {
      lastSwapAt: new Date(),
      totalSwapsMade: { increment: 1 },
    },
  })

  await dispatchNotification({
    userIds: [userId],
    category: 'autocoach',
    type: 'autocoach_swap',
    title: '⚡ AutoCoach made a swap',
    body: `${playerOut.name} (${playerOut.status}) ↔ ${playerIn.name} in ${leagueName}`,
    severity: 'low',
    actionHref: `/app/league/${leagueId}?tab=team`,
    actionLabel: 'View lineup',
    meta: { leagueId, swapLogId: swapLog.id },
  })

  return {
    rosterId,
    userId,
    leagueId,
    slotPosition,
    playerOutId: playerOut.id,
    playerOutName: playerOut.name,
    playerInId: playerIn.id,
    playerInName: playerIn.name,
    swapLogId: swapLog.id,
  }
}

export async function runAutoCoachForLeague(leagueId: string): Promise<AutoCoachSwapResult[]> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      sport: true,
      leagueVariant: true,
      bestBallMode: true,
      autoCoachEnabled: true,
      starters: true,
    },
  })

  if (!league) return []

  if (isBestBallLeague(league.leagueVariant, league.bestBallMode)) {
    return []
  }

  if (league.autoCoachEnabled === false) {
    return []
  }

  const sport = leagueSportToPlayerSport(league.sport)
  const slateDate = toSlateDateUtc(new Date())
  if (await isGameSlateStarted(sport, slateDate)) {
    return []
  }

  const settingsRows = await prisma.autoCoachSetting.findMany({
    where: {
      leagueId,
      enabled: true,
      blockedByCommissioner: false,
    },
  })

  const resolver = new EntitlementResolver()
  const results: AutoCoachSwapResult[] = []

  const rosterPositions = Array.isArray(league.starters) ? (league.starters as string[]) : []
  const slotLabels = getStarterSlotLabels(rosterPositions)

  for (const setting of settingsRows) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: setting.userId },
      select: { autoCoachGlobalEnabled: true },
    })
    if (profile?.autoCoachGlobalEnabled === false) continue

    const ent = await resolver.resolveForUser(setting.userId, 'pro_autocoach')
    if (!ent.hasAccess) continue

    const rosterFound = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: setting.userId },
      select: { id: true, playerData: true },
    })
    if (!rosterFound) continue
    let workingRoster = rosterFound

    await prisma.autoCoachSetting.update({
      where: { userId_leagueId: { userId: setting.userId, leagueId } },
      data: { lastRunAt: new Date() },
    })

    for (let pass = 0; pass < 16; pass++) {
      const sections = getNormalizedLineupSections(workingRoster.playerData)
      const starters = sections.starters
      const bench = sections.bench
      const starterIds = starters.map((s) => String(s.id))
      if (starterIds.length === 0) break

      const statusRows = await prisma.sportsPlayer.findMany({
        where: { sport, externalId: { in: starterIds } },
        select: { externalId: true, name: true, status: true, position: true },
      })
      const statusById = new Map(statusRows.map((r) => [r.externalId, r]))

      let swapped = false
      for (let i = 0; i < starters.length; i++) {
        const st = starters[i]!
        const pid = String(st.id)
        const row = statusById.get(pid)
        const rawStatus = row?.status ?? ''
        if (!rawStatus || !isSwapEligibleStatus(rawStatus)) continue

        const slotPos = slotLabels[i] ?? String(st.position ?? 'FLEX')

        const benchCandidates = bench.filter((b) => {
          const bid = String(b.id)
          if (starterIds.includes(bid)) return false
          const pos = String(b.position ?? '')
          if (!positionFitsSlot(slotPos, pos)) return false
          return true
        })

        const scored: { id: string; name: string; position: string; score: number }[] = []
        for (const b of benchCandidates) {
          const bid = String(b.id)
          const pRow = await prisma.sportsPlayer.findFirst({
            where: { sport, externalId: bid },
            select: { status: true, name: true, position: true },
          })
          const stB = pRow?.status ?? ''
          if (stB && isSwapEligibleStatus(stB)) continue

          const score = await projectionScore(bid, sport)
          scored.push({
            id: bid,
            name: pRow?.name ?? String(b.id),
            position: String(pRow?.position ?? b.position ?? 'UNK'),
            score,
          })
        }

        scored.sort((a, b) => b.score - a.score)
        const pick = scored[0]
        if (!pick) continue

        const swap = await executeAutoCoachSwap(
          workingRoster.id,
          setting.userId,
          leagueId,
          league.name ?? 'League',
          slotPos,
          { id: pid, name: row?.name ?? pid, status: rawStatus },
          { id: pick.id, name: pick.name, position: pick.position },
          'sports_player_db',
          null,
          new Date()
        )
        results.push(swap)
        swapped = true

        const fresh: { id: string; playerData: Prisma.JsonValue } | null = await prisma.roster.findUnique({
          where: { id: workingRoster.id },
          select: { id: true, playerData: true },
        })
        if (fresh) workingRoster = fresh
        break
      }
      if (!swapped) break
    }
  }

  return results
}
