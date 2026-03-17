/**
 * ClearSports integration — re-export from lib/clear-sports for backward compatibility.
 * PROMPT 153: client (rate limit, retry, timeout), normalizer, types live in lib/clear-sports/.
 */

export {
  fetchClearSportsTeams,
  fetchClearSportsPlayers,
  fetchClearSportsGames,
  normalizeClearSportsTeams,
  normalizeClearSportsPlayers,
  normalizeClearSportsGames,
  type ClearSportsSport,
  type ClearSportsTeam,
  type ClearSportsPlayer,
  type ClearSportsGame,
  type NormalizedTeam,
  type NormalizedPlayer,
  type NormalizedGame,
  type SupportedClearSportsSport,
} from './clear-sports/index'
