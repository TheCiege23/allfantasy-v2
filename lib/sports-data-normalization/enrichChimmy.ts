import 'server-only'

import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'
import type { AppPrismaClient } from '@/lib/sports-data-normalization/appPrismaClient'
import type { SupportedSport } from '@/lib/sport-scope'
import { attachSportsNormalizationToChimmyPayload } from '@/lib/sports-data-normalization/chimmyAttach'
import { mergeNormalizedSportsBatches } from '@/lib/sports-data-normalization/mergeBatches'
import { resolveNormalizedPlayerSportsProfiles } from '@/lib/sports-data-normalization/resolveNormalizedPlayerSportsProfiles'

/**
 * Fetches normalized sports profiles for grouped player names and merges into Chimmy payload.
 * Safe to call with empty groups — returns the original payload.
 */
export async function enrichChimmyWithPlayerSportsNorm(args: {
  chimmyPayload: Record<string, unknown>
  prisma: AppPrismaClient
  /** One entry per sport with player names to resolve. */
  groups: Array<{ sport: SupportedSport; names: string[] }>
  leagueScoring?: NormalizedScoringRules | null
  maxNamesPerSport?: number
}): Promise<Record<string, unknown>> {
  const max = args.maxNamesPerSport ?? 24
  const parts = []
  for (const g of args.groups) {
    const names = [...new Set(g.names.map((n) => n.trim()).filter(Boolean))].slice(0, max)
    if (names.length === 0) continue
    const batch = await resolveNormalizedPlayerSportsProfiles({
      prisma: args.prisma,
      sport: g.sport,
      players: names.map((name) => ({ name })),
      leagueScoring: args.leagueScoring ?? null,
      includeClearSportsProjections: names.length <= 18,
    })
    parts.push(batch)
  }
  const merged = mergeNormalizedSportsBatches(parts)
  if (!merged) return args.chimmyPayload
  return attachSportsNormalizationToChimmyPayload(args.chimmyPayload, merged)
}
