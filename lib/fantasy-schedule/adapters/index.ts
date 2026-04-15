/**
 * [NEW] lib/fantasy-schedule/adapters/index.ts
 * Sport-agnostic adapter factory. All adapters from nba-schedule work for any sport
 * since they operate on WeekVolumeProfile (abstract game counts, not sport-specific data).
 */

import type { FantasyWeekPlan, LeagueScheduleAdapter, SportScheduleConfig, WeekVolumeProfile } from '../types'

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

function wrapAdapter(adapter: any): LeagueScheduleAdapter {
  return {
    resolveFantasyWeek(
      volumeProfile: WeekVolumeProfile,
      config: SportScheduleConfig,
      context?: Record<string, unknown>,
    ): FantasyWeekPlan {
      const basePlan = adapter.resolveFantasyWeek(volumeProfile as unknown, config as unknown, context)
      return {
        ...basePlan,
        sport: volumeProfile.sport,
        volumeProfile: {
          ...basePlan.volumeProfile,
          sport: volumeProfile.sport,
        },
      }
    },
  }
}

const ADAPTER_MAP: Record<string, LeagueScheduleAdapter> = {
  redraft: wrapAdapter(standardAdapter),
  dynasty: wrapAdapter(standardAdapter),
  keeper: wrapAdapter(standardAdapter),
  best_ball: wrapAdapter(standardAdapter),
  salary_cap: wrapAdapter(standardAdapter),
  guillotine: wrapAdapter(guillotineAdapter),
  survivor: wrapAdapter(survivorAdapter),
  zombie: wrapAdapter(zombieAdapter),
  big_brother: wrapAdapter(bigBrotherAdapter),
  tournament: wrapAdapter(tournamentAdapter),
  c2c: wrapAdapter(c2cAdapter),
  devy: wrapAdapter(standardAdapter),
}

export function getScheduleAdapter(formatId: string): LeagueScheduleAdapter {
  return ADAPTER_MAP[formatId] ?? wrapAdapter(standardAdapter)
}
