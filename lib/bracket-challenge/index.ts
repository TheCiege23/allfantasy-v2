/**
 * Bracket Challenge UX — view service, board renderer, pick controller,
 * leaderboard resolver, scoring info, navigation.
 */

export {
  getBracketViewState,
  getBracketProgressDisplay,
  getBracketLockStateMessage,
  type BracketViewState,
  type BracketProgressDisplay,
} from './BracketChallengeViewService'

export {
  DEFAULT_REGION_ORDER,
  CLASSIC_REGION_SET,
  getRoundLabel,
  getRoundShortLabel,
  getAdaptiveRoundLabel,
  getAdaptiveRoundShortLabel,
  getBracketRoundList,
  isClassicRegionalBoard,
  getBracketCellKey,
} from './BracketBoardRenderer'

export {
  isPickLocked,
  computeEffectiveTeams,
  cascadeClearInvalidPicks,
} from './BracketPickController'

export {
  getPoolLeaderboardUrl,
  getGlobalRankingsUrl,
  getPublicPoolsUrl,
  formatRank,
} from './BracketLeaderboardResolver'

export {
  SCORING_MODE_INFO,
  pointsForRound,
  getRoundPointsSummary,
  SCORING_INFO_LABEL,
  type ScoringMode,
} from './BracketScoringInfoResolver'

export {
  BRACKET_LANDING_PATH,
  BRACKETS_HOME_PATH,
  getCreatePoolPath,
  getJoinPoolPath,
  getLeaguePath,
  getEntryBracketPath,
  getSignInNextForBrackets,
  getSignUpNextForCreate,
  getLoginNextForJoin,
} from './BracketNavigationController'

export {
  resolveBracketSportUI,
  resolveBracketChallengeLabel,
  type BracketSportUI,
} from './BracketSportUIResolver'

export type { BracketNodeLike } from './types'
