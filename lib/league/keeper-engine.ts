import type { LeagueSport } from '@prisma/client'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'

const prismaAny = prisma as any

export type KeeperWindow = {
  declarationDeadlineDaysBeforeDraft: number
  maxKeepers: number
  roundCostMode: 'previous_round' | 'fixed_round' | 'salary_value'
  requiresCommissionerApproval: boolean
}

export type KeeperRecommendation = KeeperWindow & {
  sport: LeagueSport
  leagueType: string
  carryoverSupported: boolean
}

export function resolveKeeperPolicy(options: {
  sport: LeagueSport | string
  leagueType?: string | null
  draftType?: string | null
}): KeeperRecommendation {
  const sport = normalizeToSupportedSport(options.sport)
  const leagueType = String(options.leagueType ?? 'redraft').toLowerCase()
  const draftType = String(options.draftType ?? 'snake').toLowerCase()
  const isKeeper = leagueType === 'keeper'
  const isDynasty = leagueType === 'dynasty' || leagueType === 'devy' || leagueType === 'c2c'

  const maxKeepers = isDynasty
    ? 999
    : isKeeper
      ? sport === 'MLB' || sport === 'NHL'
        ? 8
        : 4
      : 0

  return {
    sport,
    leagueType,
    carryoverSupported: isKeeper || isDynasty,
    declarationDeadlineDaysBeforeDraft: draftType === 'slow_draft' ? 7 : 2,
    maxKeepers,
    roundCostMode: draftType === 'auction' ? 'salary_value' : isDynasty ? 'fixed_round' : 'previous_round',
    requiresCommissionerApproval: !isDynasty,
  }
}

export function supportsKeeperDeclarations(leagueType?: string | null): boolean {
  const key = String(leagueType ?? '').toLowerCase()
  return key === 'keeper' || key === 'dynasty' || key === 'devy' || key === 'c2c'
}

export async function expireOverdueKeeperDeclarations(now = new Date()): Promise<number> {
  const result = await prismaAny.keeperDeclaration.updateMany({
    where: {
      status: 'declared',
      deadlineAt: {
        lt: now,
      },
    },
    data: {
      status: 'expired',
      updatedAt: now,
    },
  })

  return result.count
}

export async function auditDynastyCutdowns(): Promise<
  Array<{ leagueId: string; rosterId: string; overBy: number }>
> {
  const leagues = await prisma.league.findMany({
    where: {
      isDynasty: true,
    },
    select: {
      id: true,
      rosterSize: true,
      rosters: {
        select: {
          id: true,
          playerData: true,
        },
      },
    },
  })

  const flagged: Array<{ leagueId: string; rosterId: string; overBy: number }> = []
  for (const league of leagues) {
    const rosterSize = league.rosterSize ?? 0
    if (rosterSize <= 0) continue
    for (const roster of league.rosters) {
      const size = getRosterPlayerIds(roster.playerData).length
      if (size > rosterSize) {
        flagged.push({
          leagueId: league.id,
          rosterId: roster.id,
          overBy: size - rosterSize,
        })
      }
    }
  }

  return flagged
}
