/**
 * Re-export — canonical validation lives under `lib/league-creation/canonical`.
 * This path exists for teams that mirror a `server/` layout alongside Next.js Route Handlers.
 */

export {
  validateCreatePayload,
  stripForbiddenCreateLeagueFields,
  normalizeDraftTypeForEngine,
  createLeagueBodySchema,
  FORBIDDEN_CREATE_LEAGUE_USER_KEYS,
} from '@/lib/league-creation/canonical/validateCreateLeague'
export type { ValidatedCreateLeagueBody, ValidateCreateLeagueResult } from '@/lib/league-creation/canonical/validateCreateLeague'
