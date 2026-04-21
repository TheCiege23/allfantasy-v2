/**
 * Resolve external source player ids (Sleeper, ESPN, Yahoo, MFL, Fantrax,
 * Fleaflicker) to AF's canonical PlayerIdentityMap rows. Used by scoring
 * lookups to match imported roster entries against weekly stats.
 *
 * Strategy:
 *   1. Direct lookup by the provider-specific id column on PlayerIdentityMap.
 *   2. Fallback to normalized-name match when the provider column is unset.
 *   3. Record a warning when no match (caller decides whether to surface).
 */

import { prisma } from '@/lib/prisma'
import type { ImportProvider } from './types'

export interface PlayerIdResolveResult {
  canonicalId: string | null
  confidence: 'direct' | 'name_match' | 'miss'
}

type ProviderColumn = 'sleeperId' | 'espnId' | 'mflId' | 'fleaflickerId'

const PROVIDER_COLUMN: Partial<Record<ImportProvider, ProviderColumn>> = {
  sleeper: 'sleeperId',
  espn: 'espnId',
  mfl: 'mflId',
  fleaflicker: 'fleaflickerId',
  // yahoo / fantrax have no dedicated column yet — fallback to name match.
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

/**
 * Resolve a single source player id. Pass `nameHint` to enable fallback
 * normalized-name matching when the provider-specific column is null.
 */
export async function resolveCanonicalPlayerId(args: {
  provider: ImportProvider
  sourceId: string
  nameHint?: string | null
  positionHint?: string | null
}): Promise<PlayerIdResolveResult> {
  const column = PROVIDER_COLUMN[args.provider]
  if (column) {
    const direct = await prisma.playerIdentityMap.findFirst({
      where: { [column]: args.sourceId } as Record<string, string>,
      select: { id: true },
    })
    if (direct) return { canonicalId: direct.id, confidence: 'direct' }
  }

  if (args.nameHint) {
    const normalized = normalizeName(args.nameHint)
    if (normalized.length > 0) {
      const byName = await prisma.playerIdentityMap.findFirst({
        where: {
          normalizedName: normalized,
          ...(args.positionHint ? { position: args.positionHint.toUpperCase() } : {}),
        },
        select: { id: true },
      })
      if (byName) return { canonicalId: byName.id, confidence: 'name_match' }
    }
  }

  return { canonicalId: null, confidence: 'miss' }
}

/**
 * Bulk resolver. Returns a map keyed by source id. Callers pass a
 * hydrated player-map (name + position) when available for better matching.
 */
export async function resolveCanonicalPlayerIds(args: {
  provider: ImportProvider
  sourceIds: string[]
  playerMap?: Record<string, { name: string; position: string }>
}): Promise<Record<string, PlayerIdResolveResult>> {
  const out: Record<string, PlayerIdResolveResult> = {}
  for (const sourceId of args.sourceIds) {
    const hint = args.playerMap?.[sourceId]
    out[sourceId] = await resolveCanonicalPlayerId({
      provider: args.provider,
      sourceId,
      nameHint: hint?.name ?? null,
      positionHint: hint?.position ?? null,
    })
  }
  return out
}
