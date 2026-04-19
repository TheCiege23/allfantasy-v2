import type { LeagueToolAccessErrorCode } from '@/lib/ai-tools/league-tool-context-types'

/** Thrown from league-aware tools when `assertLeagueMemberWithCode` fails (catch and map to JSON). */
export class LeagueToolAccessDeniedError extends Error {
  readonly code: LeagueToolAccessErrorCode
  constructor(code: LeagueToolAccessErrorCode) {
    super(leagueToolAccessUserMessage(code))
    this.name = 'LeagueToolAccessDeniedError'
    this.code = code
  }
}

/** User-facing copy for structured league-tool API errors (avoid generic “access denied”). */
export function leagueToolAccessUserMessage(code: LeagueToolAccessErrorCode): string {
  switch (code) {
    case 'MISSING_LEAGUE_CONTEXT':
      return 'Select a league to load this view.'
    case 'MISSING_USER_CONTEXT':
      return 'Sign in required.'
    case 'INVALID_LEAGUE_ID':
      return 'Missing or invalid league id.'
    case 'LEAGUE_NOT_FOUND':
      return 'League not found.'
    case 'NOT_LEAGUE_MEMBER':
      return 'You do not have access to this league.'
    case 'ACCESS_DENIED':
      return 'Access denied for this league.'
    case 'TEAM_NOT_FOUND':
      return 'That team was not found in this league.'
    case 'TEAM_CONTEXT_UNAVAILABLE':
      return 'Team context could not be resolved for this league.'
    case 'IMPORT_MAPPING_MISSING':
      return 'Imported league mapping unavailable — try re-syncing your import.'
    case 'DATA_LOAD_FAILED':
      return 'Data failed to load. Try again shortly.'
    default:
      return 'Unable to load league context.'
  }
}

/**
 * HTTP status for AI tool routes — align with injury-impact dashboard behavior.
 */
export function httpStatusForLeagueToolCode(
  code:
    | LeagueToolAccessErrorCode
    | 'VALIDATION'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'INTERNAL'
    | 'UNAUTHORIZED'
    | 'NO_LEAGUE'
    | 'NO_ROSTER'
    | 'SPORT_MISMATCH'
    | undefined,
): number {
  if (code === 'FORBIDDEN') return 403
  if (code === 'INTERNAL') return 500
  if (code === 'UNAUTHORIZED') return 401
  if (code === 'NOT_FOUND') return 404
  if (code === 'VALIDATION' || code === undefined) return 400
  if (code === 'NO_LEAGUE' || code === 'NO_ROSTER' || code === 'SPORT_MISMATCH') return 400
  switch (code) {
    case 'NOT_LEAGUE_MEMBER':
      return 403
    case 'LEAGUE_NOT_FOUND':
      return 404
    case 'DATA_LOAD_FAILED':
      return 503
    case 'MISSING_LEAGUE_CONTEXT':
    case 'MISSING_USER_CONTEXT':
    case 'INVALID_LEAGUE_ID':
    case 'TEAM_CONTEXT_UNAVAILABLE':
    case 'IMPORT_MAPPING_MISSING':
      return 400
    case 'TEAM_NOT_FOUND':
      return 404
    case 'ACCESS_DENIED':
      return 403
    default:
      return 400
  }
}
