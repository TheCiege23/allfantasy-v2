import { prisma } from '@/lib/prisma'
import { requireAfSubUserIdOrThrow } from '@/lib/redraft/ai/requireAfSub'

/**
 * AfSub-only AI narrations. Deterministic fallbacks stay in non-AI engines.
 */
export async function generateWeeklyRecap(leagueId: string, week: number) {
  await requireAfSubUserIdOrThrow()
  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    include: { weeklyResolutions: { where: { week }, take: 1 } },
  })
  if (!z) throw new Error('Zombie league not found')

  const body = `Week ${week} — infection spread and horde dynamics (AI body to be wired to Chimmy).`

  return prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId: z.id,
      universeId: z.universeId,
      type: 'ai_recap',
      title: `Week ${week} — Horde report`,
      content: body,
      week,
    },
  })
}

export async function generateUniverseStandingsUpdate(universeId: string) {
  await requireAfSubUserIdOrThrow()
  const u = await prisma.zombieUniverse.findUnique({ where: { id: universeId } })
  if (!u) throw new Error('Universe not found')

  const zl = await prisma.zombieLeague.findFirst({ where: { universeId } })
  if (!zl) throw new Error('No leagues in universe')

  return prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId: zl.id,
      universeId,
      type: 'universe_standings',
      title: 'Universe standings update',
      content: 'Tier leaders and movement outlook (AI narrative pending).',
    },
  })
}

export async function generateMovementAnnouncements(universeId: string, season: number) {
  await requireAfSubUserIdOrThrow()
  const moves = await prisma.zombieMovementRecord.findMany({
    where: { universeId, season },
  })
  const zl = await prisma.zombieLeague.findFirst({ where: { universeId } })
  if (!zl) throw new Error('No zombie league row for announcements')

  const created = []
  for (const m of moves) {
    const a = await prisma.zombieAnnouncement.create({
      data: {
        zombieLeagueId: zl.id,
        universeId,
        type: 'promotion_relegation',
        title: `${m.displayName}: ${m.movementType}`,
        content: `${m.fromTierLabel} → ${m.toTierLabel} (${m.reason})`,
      },
    })
    created.push(a)
  }
  return created
}
