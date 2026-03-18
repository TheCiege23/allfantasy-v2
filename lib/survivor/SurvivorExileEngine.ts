/**
 * Survivor Exile Island: create/link exile league, enroll eliminated (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'

/**
 * Ensure Exile Island league exists and is linked. Creates a new League row for exile if needed.
 */
export async function getOrCreateExileLeague(
  mainLeagueId: string,
  options?: { sport?: string; name?: string }
): Promise<{ exileLeagueId: string; created: boolean }> {
  const config = await getSurvivorConfig(mainLeagueId)
  if (!config) throw new Error('Not a Survivor league')

  const existing = await prisma.survivorExileLeague.findUnique({
    where: { mainLeagueId },
  })
  if (existing) return { exileLeagueId: existing.exileLeagueId, created: false }

  const main = await prisma.league.findUnique({
    where: { id: mainLeagueId },
    select: { userId: true, sport: true, name: true },
  })
  if (!main) throw new Error('Main league not found')

  const exileLeague = await prisma.league.create({
    data: {
      userId: main.userId,
      platform: 'manual',
      platformLeagueId: `exile-${mainLeagueId}-${Date.now()}`,
      name: options?.name ?? `Exile Island: ${main.name ?? 'Survivor'}`,
      sport: (options?.sport ?? main.sport) as any,
      leagueVariant: 'survivor_exile',
      leagueSize: 20,
      scoring: main.scoring ?? undefined,
      isDynasty: false,
    },
  })

  await prisma.survivorExileLeague.create({
    data: {
      mainLeagueId,
      configId: config.configId,
      exileLeagueId: exileLeague.id,
    },
  })

  return { exileLeagueId: exileLeague.id, created: true }
}

/**
 * Enroll eliminated roster into Exile. Creates a roster in the exile league for the same user.
 */
export async function enrollInExile(
  mainLeagueId: string,
  rosterId: string,
  platformUserId: string
): Promise<{ ok: boolean; exileRosterId?: string; error?: string }> {
  const config = await getSurvivorConfig(mainLeagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const { exileLeagueId } = await getOrCreateExileLeague(mainLeagueId)

  const existing = await prisma.roster.findFirst({
    where: { leagueId: exileLeagueId, platformUserId },
  })
  if (existing) {
    await appendSurvivorAudit(mainLeagueId, config.configId, 'exile_enrolled', {
      rosterId,
      exileRosterId: existing.id,
    })
    return { ok: true, exileRosterId: existing.id }
  }

  const exileRoster = await prisma.roster.create({
    data: {
      leagueId: exileLeagueId,
      platformUserId,
      playerData: {},
    },
  })
  await appendSurvivorAudit(mainLeagueId, config.configId, 'exile_enrolled', {
    rosterId,
    exileRosterId: exileRoster.id,
  })
  return { ok: true, exileRosterId: exileRoster.id }
}

/**
 * Get exile league id for main league.
 */
export async function getExileLeagueId(mainLeagueId: string): Promise<string | null> {
  const row = await prisma.survivorExileLeague.findUnique({
    where: { mainLeagueId },
    select: { exileLeagueId: true },
  })
  return row?.exileLeagueId ?? null
}
