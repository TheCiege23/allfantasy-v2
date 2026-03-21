/**
 * Multi-sport core: sport registry, config resolution, league/roster/scoring/schedule services.
 * Use these modules to keep NFL behavior while adding NHL, MLB, NBA, NCAAF, NCAAB.
 */

export * from './sport-types'
export * from './SportRegistry'
export * from './SportConfigResolver'
export * from './LeagueVariantRegistry'
export * from './SportVariantContextResolver'
export * from './RosterTemplateService'
export * from './ScoringTemplateResolver'
export * from './MultiSportLeagueService'
export * from './MultiSportRosterService'
export * from './MultiSportScoringResolver'
export * from './MultiSportScheduleResolver'
export * from './MultiSportMatchupScoringService'
export * from './ProjectionSeedResolver'
