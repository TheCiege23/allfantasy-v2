import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type ZombieRulesResolved = {
  sport: string
  bashingThreshold: number
  maulingThreshold: number
  weaponShieldThreshold: number
  weaponAmbushThreshold: number
  reviveThreshold: number
  serumMaxHold: number
  lineupLockDesc: string | null
}

const NFL_LOCK = 'Thursday 8:15 PM ET earliest kickoff for NFL scoring week.'

export async function getZombieRulesForSport(sportRaw: string): Promise<ZombieRulesResolved> {
  const sport = normalizeToSupportedSport(sportRaw)
  const row = await prisma.zombieRulesTemplate.findUnique({ where: { sport } })
  return {
    sport,
    bashingThreshold: row?.bashingThreshold ?? 30,
    maulingThreshold: row?.maulingThreshold ?? 50,
    weaponShieldThreshold: row?.weaponShieldThreshold ?? 100,
    weaponAmbushThreshold: row?.weaponAmbushThreshold ?? 120,
    reviveThreshold: row?.reviveThreshold ?? 3,
    serumMaxHold: row?.serumMaxHold ?? 5,
    lineupLockDesc: row?.lineupLockDesc ?? (sport === 'NFL' ? NFL_LOCK : 'First game of the scoring period.'),
  }
}
