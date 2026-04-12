/**
 * [NEW] lib/fantasy-schedule/FantasyWeekResolver.ts
 * Sport-agnostic fantasy week resolver. Works for NBA, NHL, and any future sport.
 */

import { getWeekVolumeProfile } from './GameVolumeService'
import { getScheduleConfigForLeague } from './ScheduleConfigService'
import { getScheduleAdapter } from './adapters'
import type { FantasyWeekPlan, ScheduleSport } from './types'
import type { LeagueFormatId } from '@/lib/league/format-engine'

export async function resolveFantasyWeek(options: {
  leagueId: string
  sport: ScheduleSport
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  const { leagueId, sport, leagueFormatId, season, week, context } = options
  const config = await getScheduleConfigForLeague(leagueId)
  const volumeProfile = await getWeekVolumeProfile(sport, season, week, {
    thresholdHeavy: config.volumeThresholdHeavy,
    thresholdModerate: config.volumeThresholdModerate,
  })
  const leagueType = mapVariantToFormatId(leagueFormatId, options.leagueVariant)
  const adapter = getScheduleAdapter(leagueType)
  return adapter.resolveFantasyWeek(volumeProfile, config, context)
}

function mapVariantToFormatId(formatId: LeagueFormatId, variant?: string | null): LeagueFormatId {
  if (variant === 'big_brother') return 'big_brother' as LeagueFormatId
  if (variant === 'devy_dynasty') return 'devy' as LeagueFormatId
  if (variant === 'merged_devy_c2c') return 'c2c' as LeagueFormatId
  if (variant === 'tournament_mode') return 'tournament' as LeagueFormatId
  return formatId
}
