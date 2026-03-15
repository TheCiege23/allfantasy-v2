/**
 * League creation initialization service — applies sport-specific default settings
 * when a league is created. Re-exports LeagueCreationInitializer for the named module
 * used in league creation end-to-end flow (Prompt 10).
 */
export {
  initializeLeagueWithSportDefaults,
  type InitializeLeagueOptions,
} from '@/lib/sport-defaults/LeagueCreationInitializer'
