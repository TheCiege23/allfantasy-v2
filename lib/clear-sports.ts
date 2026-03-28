/**
 * ClearSports integration — re-export from lib/clear-sports for backward compatibility.
 * PROMPT 153: client (rate limit, retry, timeout), normalizer, types live in lib/clear-sports/.
 */

export {
  fetchClearSportsTeams,
  fetchClearSportsPlayers,
  fetchClearSportsGames,
  fetchClearSportsRankings,
  fetchClearSportsProjections,
  fetchClearSportsTrends,
  fetchClearSportsNews,
  normalizeClearSportsTeams,
  normalizeClearSportsPlayers,
  normalizeClearSportsGames,
  getClearSportsToolStates,
  runClearSportsHealthCheck,
  type ClearSportsSport,
  type ClearSportsTeam,
  type ClearSportsPlayer,
  type ClearSportsGame,
  type ClearSportsHealthCheckResult,
  type NormalizedTeam,
  type NormalizedPlayer,
  type NormalizedGame,
  type SupportedClearSportsSport,
  type ClearSportsConsumerTool,
  type ClearSportsToolState,
  type ClearSportsToolStateMap,
} from './clear-sports/index'
