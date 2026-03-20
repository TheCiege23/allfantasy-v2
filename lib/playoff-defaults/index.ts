/**
 * Playoff defaults and resolvers — sport- and variant-aware playoff presets and league config.
 */
export {
	getPlayoffPreset,
	resolveDefaultPlayoffConfig,
	getPlayoffPresetDefinitions,
	getSupportedPlayoffVariantsForSport,
} from './PlayoffDefaultsRegistry'
export type { DefaultPlayoffConfig } from '@/lib/sport-defaults/types'
export { resolvePlayoffPreset } from './PlayoffPresetResolver'
export type { PlayoffPresetResult } from './PlayoffPresetResolver'
export { bootstrapLeaguePlayoffConfig } from './LeaguePlayoffBootstrapService'
export type { LeaguePlayoffBootstrapResult } from './LeaguePlayoffBootstrapService'
export { getBracketConfigForLeague } from './PlayoffBracketConfigResolver'
export type { PlayoffBracketConfig } from './PlayoffBracketConfigResolver'
export { getSeedingRulesForLeague } from './PlayoffSeedingResolver'
export type { PlayoffSeedingConfig } from './PlayoffSeedingResolver'
export { getStandingsTiebreakersForLeague } from './StandingsTiebreakerResolver'
export type { StandingsTiebreakerConfig } from './StandingsTiebreakerResolver'
export { getPlayoffConfigForLeague } from './PlayoffConfigResolver'
export type { PlayoffConfigForLeague } from './PlayoffConfigResolver'
