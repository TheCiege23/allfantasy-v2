/**
 * Schedule defaults and resolvers — sport- and variant-aware schedule behavior and league config.
 */
export { getSchedulePreset, resolveDefaultScheduleConfig } from './ScheduleDefaultsRegistry'
export type { DefaultScheduleConfig } from '@/lib/sport-defaults/types'
export { resolveSchedulePreset } from './SchedulePresetResolver'
export type { SchedulePresetResult } from './SchedulePresetResolver'
export { bootstrapLeagueScheduleConfig } from './LeagueScheduleBootstrapService'
export type { LeagueScheduleBootstrapResult } from './LeagueScheduleBootstrapService'
export { getMatchupCadenceForLeague } from './MatchupCadenceResolver'
export type { MatchupCadenceConfig } from './MatchupCadenceResolver'
export { getScoringWindowConfigForLeague } from './ScoringWindowResolver'
export type { ScoringWindowConfig } from './ScoringWindowResolver'
export { getLeagueScheduleGenerationContext } from './LeagueScheduleGenerationService'
export type { LeagueScheduleGenerationContext } from './LeagueScheduleGenerationService'
export { getScheduleConfigForLeague } from './ScheduleConfigResolver'
export type { ScheduleConfigForLeague } from './ScheduleConfigResolver'
