import type { PrismaClient } from '@prisma/client'

const NFL_STANDARD = {
  rosterSize: 18,
  startCount: 9,
  lineupSlots: [
    { slot: 'QB', eligible: ['QB'], count: 1, required: true },
    { slot: 'RB', eligible: ['RB'], count: 2, required: true },
    { slot: 'WR', eligible: ['WR'], count: 3, required: true },
    { slot: 'TE', eligible: ['TE'], count: 1, required: true },
    { slot: 'FLEX', eligible: ['RB', 'WR', 'TE'], count: 1, required: true },
    { slot: 'K', eligible: ['K'], count: 1, required: false },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 18,
  depthRequirements: { QB: 2, RB: 4, WR: 5, TE: 2, K: 1 },
}

const NFL_TOURNAMENT = {
  rosterSize: 18,
  startCount: 8,
  lineupSlots: [
    { slot: 'QB', eligible: ['QB'], count: 1, required: true },
    { slot: 'RB', eligible: ['RB'], count: 2, required: true },
    { slot: 'WR', eligible: ['WR'], count: 3, required: true },
    { slot: 'TE', eligible: ['TE'], count: 1, required: true },
    { slot: 'FLEX', eligible: ['RB', 'WR', 'TE'], count: 1, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 18,
  depthRequirements: { QB: 3, RB: 5, WR: 6, TE: 2 },
}

const NBA_BB = {
  rosterSize: 13,
  startCount: 5,
  lineupSlots: [
    { slot: 'G', eligible: ['PG', 'SG'], count: 2, required: true },
    { slot: 'F', eligible: ['SF', 'PF'], count: 2, required: true },
    { slot: 'C', eligible: ['C'], count: 1, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 23,
  depthRequirements: { PG: 2, SG: 2, SF: 2, PF: 2, C: 2 },
}

const MLB_BB = {
  rosterSize: 25,
  startCount: 13,
  lineupSlots: [
    { slot: 'C', eligible: ['C'], count: 1, required: true },
    { slot: '1B', eligible: ['1B'], count: 1, required: true },
    { slot: '2B', eligible: ['2B'], count: 1, required: true },
    { slot: '3B', eligible: ['3B'], count: 1, required: true },
    { slot: 'SS', eligible: ['SS'], count: 1, required: true },
    { slot: 'OF', eligible: ['OF'], count: 3, required: true },
    { slot: 'UTIL', eligible: ['*'], count: 1, required: true },
    { slot: 'SP', eligible: ['SP'], count: 2, required: true },
    { slot: 'P', eligible: ['SP', 'RP'], count: 2, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 27,
  depthRequirements: { C: 2, OF: 5, SP: 4, RP: 3 },
}

const NHL_BB = {
  rosterSize: 16,
  startCount: 8,
  lineupSlots: [
    { slot: 'C', eligible: ['C'], count: 2, required: true },
    { slot: 'W', eligible: ['LW', 'RW'], count: 3, required: true },
    { slot: 'D', eligible: ['D'], count: 2, required: true },
    { slot: 'G', eligible: ['G'], count: 1, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 24,
  depthRequirements: { C: 3, LW: 2, RW: 2, D: 4, G: 2 },
}

const NCAAF_BB = {
  rosterSize: 15,
  startCount: 7,
  lineupSlots: [
    { slot: 'QB', eligible: ['QB'], count: 1, required: true },
    { slot: 'RB', eligible: ['RB'], count: 2, required: true },
    { slot: 'WR', eligible: ['WR'], count: 3, required: true },
    { slot: 'FLEX', eligible: ['RB', 'WR', 'TE'], count: 1, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 15,
  depthRequirements: { QB: 2, RB: 3, WR: 4 },
}

const NCAAB_BB = {
  rosterSize: 10,
  startCount: 5,
  lineupSlots: [
    { slot: 'G', eligible: ['PG', 'SG'], count: 2, required: true },
    { slot: 'F', eligible: ['SF', 'PF'], count: 2, required: true },
    { slot: 'C', eligible: ['C'], count: 1, required: true },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 20,
  depthRequirements: { PG: 2, SG: 2, SF: 2, PF: 1, C: 2 },
}

const SOCCER_BB = {
  rosterSize: 15,
  startCount: 11,
  lineupSlots: [
    { slot: 'GK', eligible: ['GK'], count: 1, required: true },
    { slot: 'DEF', eligible: ['DEF'], count: 3, required: true, min: 3, max: 5 },
    { slot: 'MID', eligible: ['MID'], count: 3, required: true, min: 2, max: 5 },
    { slot: 'FWD', eligible: ['FWD'], count: 3, required: true, min: 1, max: 4 },
  ],
  scoringPeriod: 'weekly',
  scoringWeeks: 38,
  depthRequirements: { GK: 2, DEF: 5, MID: 5, FWD: 3 },
}

export async function seedBestBallTemplates(prisma: PrismaClient): Promise<void> {
  const rows: {
    sport: string
    variant: string
    rosterSize: number
    startCount: number
    lineupSlots: unknown
    scoringPeriod: string
    scoringWeeks: number | null
    tiebreaker: string
    lockRule: string
    depthRequirements: unknown
  }[] = [
    { sport: 'NFL', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...NFL_STANDARD },
    { sport: 'NFL', variant: 'private_league', tiebreaker: 'points_for', lockRule: 'game_start', ...NFL_STANDARD },
    { sport: 'NFL', variant: 'tournament', tiebreaker: 'points_for', lockRule: 'game_start', ...NFL_TOURNAMENT },
    { sport: 'NBA', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...NBA_BB },
    { sport: 'MLB', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...MLB_BB },
    { sport: 'NHL', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...NHL_BB },
    { sport: 'NCAAF', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...NCAAF_BB },
    { sport: 'NCAAB', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...NCAAB_BB },
    { sport: 'SOCCER', variant: 'standard', tiebreaker: 'points_for', lockRule: 'game_start', ...SOCCER_BB },
  ]

  for (const r of rows) {
    await prisma.bestBallSportTemplate.upsert({
      where: { sport_variant: { sport: r.sport, variant: r.variant } },
      create: {
        sport: r.sport,
        variant: r.variant,
        rosterSize: r.rosterSize,
        startCount: r.startCount,
        lineupSlots: r.lineupSlots as object,
        scoringPeriod: r.scoringPeriod,
        scoringWeeks: r.scoringWeeks,
        tiebreaker: r.tiebreaker,
        lockRule: r.lockRule,
        depthRequirements: r.depthRequirements as object,
      },
      update: {
        rosterSize: r.rosterSize,
        startCount: r.startCount,
        lineupSlots: r.lineupSlots as object,
        scoringPeriod: r.scoringPeriod,
        scoringWeeks: r.scoringWeeks,
        tiebreaker: r.tiebreaker,
        lockRule: r.lockRule,
        depthRequirements: r.depthRequirements as object,
      },
    })
  }
  console.log(`Seeded ${rows.length} BestBallSportTemplate rows`)
}
