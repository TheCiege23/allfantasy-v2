import 'server-only'

import { prisma } from '@/lib/prisma'
import type { SupportedSport } from '@/lib/sport-scope'

export type InjuryRecord = {
  playerName: string
  team: string
  status: string
  bodyPart: string | null
  notes: string | null
  sport: string
  reportDate: Date
}

/** Cache-only injury lookup: checks injuryReportRecord then sportsInjury; never calls providers. */
export async function getInjuries(sport: SupportedSport | string, options?: { team?: string; limit?: number }): Promise<InjuryRecord[]> {
  const limit = options?.limit ?? 50

  // 1. Check injuryReportRecord (primary normalized table)
  try {
    const where: Record<string, unknown> = { sport: sport.toUpperCase() }
    if (options?.team) where.team = options.team
    const rows = await prisma.injuryReportRecord.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: limit,
    })
    if (rows.length > 0) {
      return rows.map((r) => ({
        playerName: r.playerName,
        team: r.team,
        status: r.status,
        bodyPart: r.bodyPart,
        notes: r.notes,
        sport: r.sport,
        reportDate: r.reportDate,
      }))
    }
  } catch {}

  // 2. Check sportsInjury (legacy table)
  try {
    const where: Record<string, unknown> = { sport: sport.toUpperCase() }
    if (options?.team) where.team = options.team
    const rows = await prisma.sportsInjury.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    if (rows.length > 0) {
      return rows.map((r) => ({
        playerName: r.playerName,
        team: r.team || 'FA',
        status: r.status || 'unknown',
        bodyPart: r.description || null,
        notes: null,
        sport: r.sport,
        reportDate: r.updatedAt,
      }))
    }
  } catch {}

  return []
}

/** Get injuries for a specific player by name. */
export async function getPlayerInjury(playerName: string, sport: string): Promise<InjuryRecord | null> {
  const all = await getInjuries(sport, { limit: 500 })
  return all.find((r) => r.playerName.toLowerCase() === playerName.toLowerCase()) ?? null
}
