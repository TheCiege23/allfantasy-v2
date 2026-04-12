/**
 * [NEW] lib/fantasy-schedule/adapters/index.ts
 * Sport-agnostic adapter factory. All adapters from nba-schedule work for any sport
 * since they operate on WeekVolumeProfile (abstract game counts, not sport-specific data).
 */

import type { LeagueScheduleAdapter } from '../types'

// Import adapters from the NBA module (they're sport-agnostic)
import { StandardScheduleAdapter } from '@/lib/nba-schedule/adapters/StandardScheduleAdapter'
import { GuillotineScheduleAdapter } from '@/lib/nba-schedule/adapters/GuillotineScheduleAdapter'
import { SurvivorScheduleAdapter } from '@/lib/nba-schedule/adapters/SurvivorScheduleAdapter'
import { ZombieScheduleAdapter } from '@/lib/nba-schedule/adapters/ZombieScheduleAdapter'
import { BigBrotherScheduleAdapter } from '@/lib/nba-schedule/adapters/BigBrotherScheduleAdapter'
import { TournamentScheduleAdapter } from '@/lib/nba-schedule/adapters/TournamentScheduleAdapter'
import { C2CScheduleAdapter } from '@/lib/nba-schedule/adapters/C2CScheduleAdapter'

const standardAdapter = new StandardScheduleAdapter()
const guillotineAdapter = new GuillotineScheduleAdapter()
const survivorAdapter = new SurvivorScheduleAdapter()
const zombieAdapter = new ZombieScheduleAdapter()
const bigBrotherAdapter = new BigBrotherScheduleAdapter()
const tournamentAdapter = new TournamentScheduleAdapter()
const c2cAdapter = new C2CScheduleAdapter()

const ADAPTER_MAP: Record<string, LeagueScheduleAdapter> = {
  redraft: standardAdapter,
  dynasty: standardAdapter,
  keeper: standardAdapter,
  best_ball: standardAdapter,
  salary_cap: standardAdapter,
  guillotine: guillotineAdapter,
  survivor: survivorAdapter,
  zombie: zombieAdapter,
  big_brother: bigBrotherAdapter,
  tournament: tournamentAdapter,
  c2c: c2cAdapter,
  devy: standardAdapter,
}

export function getScheduleAdapter(formatId: string): LeagueScheduleAdapter {
  return ADAPTER_MAP[formatId] ?? standardAdapter
}
