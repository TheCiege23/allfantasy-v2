import { prisma } from '@/lib/prisma'
import { getNormalizedLineupSections, type RosterSectionKey } from '@/lib/roster/LineupTemplateValidation'

type Db = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma

/**
 * Replace normalized `af_roster_lineup_assignments` rows for a roster/week from `playerData`.
 */
export async function syncAfRosterLineupAssignments(
  input: {
    leagueId: string
    rosterId: string
    season: number
    week: number
    playerData: unknown
  },
  db: Db = prisma,
): Promise<void> {
  const sections = getNormalizedLineupSections(input.playerData)
  const rows: Array<{
    leagueId: string
    rosterId: string
    season: number
    week: number
    section: string
    slotIndex: number
    playerId: string
  }> = []

  const keys: RosterSectionKey[] = ['starters', 'bench', 'ir', 'taxi', 'devy']
  for (const section of keys) {
    let i = 0
    for (const row of sections[section]) {
      const id = String((row as Record<string, unknown>).id ?? '').trim()
      if (!id) continue
      rows.push({
        leagueId: input.leagueId,
        rosterId: input.rosterId,
        season: input.season,
        week: input.week,
        section,
        slotIndex: i++,
        playerId: id,
      })
    }
  }

  await db.afRosterLineupAssignment.deleteMany({
    where: {
      rosterId: input.rosterId,
      season: input.season,
      week: input.week,
    },
  })
  if (rows.length > 0) {
    await db.afRosterLineupAssignment.createMany({ data: rows })
  }
}
