/**
 * Single service that runs all post-creation initialization steps so each created league
 * boots with the correct settings everywhere (roster, scoring, waiver, draft, playoff, schedule, player pool).
 */
import type { LeagueSport } from '@prisma/client'
import { runLeagueBootstrap } from '@/lib/league-creation/LeagueBootstrapOrchestrator'
import type { BootstrapResult } from '@/lib/league-creation/LeagueBootstrapOrchestrator'
import { resolveSportVariantContext } from './SportVariantContextResolver'

/**
 * Run full league initialization after create. Applies roster, settings, scoring, player pool,
 * draft, waiver, playoff, and schedule defaults. Idempotent where applicable.
 * Use this (or runLeagueBootstrap) as the single entry point for post-create bootstrap.
 */
export async function runLeagueInitialization(
  leagueId: string,
  sport: LeagueSport | string,
  variantOrFormat?: string | null
): Promise<BootstrapResult> {
  const context = resolveSportVariantContext(sport as LeagueSport, variantOrFormat ?? null)
  const format = context.isNflIdp ? 'IDP' : (variantOrFormat ?? undefined)
  return runLeagueBootstrap(leagueId, context.sport, format)
}
