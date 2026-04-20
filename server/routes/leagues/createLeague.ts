/**
 * Re-export — HTTP entry for Create League is Next.js `POST /api/leagues` (`app/api/leagues/route.ts`).
 * Import `postCreateLeague` for tests or custom adapters.
 */

export { postCreateLeague } from '@/lib/league-creation/canonical/createLeagueHandler'
