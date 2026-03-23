export {
  getLeagueFilterOptions,
  resolveFilters,
  buildDiscoveryWhere,
  matchesLeagueTypeAndFee,
  LEAGUE_TYPE_IDS,
  ENTRY_FEE_IDS,
  VISIBILITY_IDS,
  DIFFICULTY_IDS,
  type LeagueFilterOptions,
  type ResolvedFilters,
  type LeagueTypeId,
  type EntryFeeId,
  type VisibilityId,
  type DifficultyId,
} from "./LeagueFilterResolver"

export {
  buildSearchWhere,
  normalizeSearchQuery,
} from "./LeagueSearchResolver"

export {
  discoverLeagues,
  suggestLeagues,
  type DiscoverLeaguesInput,
  type DiscoverLeaguesResult,
} from "./LeagueDiscoveryService"

export type {
  LeagueCard,
  CandidateLeague,
  UserDiscoveryPreferences,
  SuggestLeaguesResult,
  LeagueMatchSuggestion,
  SkillLevel,
  ActivityPreference,
  CompetitionBalancePreference,
} from "./types"
