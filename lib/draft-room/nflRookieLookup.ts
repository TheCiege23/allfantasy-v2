/**
 * D.7 — NFL rookie / years-of-experience lookup.
 *
 * Sleeper's player payload (cached 24h in `lib/sleeper-client`) includes a
 * `years_exp` field that is the authoritative source of "first NFL season"
 * for redraft / dynasty rookie filtering. We build a Map keyed by
 * `<normalized name>|<position>` so the resolved draft pool can attach
 * `yearsExp` (and a derived `isRookie` flag) onto each row before
 * `normalizeDraftPlayer` runs.
 *
 * Keep this module side-effect-free: it does NOT mutate Sleeper's cache and
 * NEVER throws — Sleeper failures degrade to "rookie data unavailable" in the
 * UI rather than breaking the pool fetch.
 */

import { getAllPlayers, type SleeperPlayer } from '@/lib/sleeper-client'

export type RookieMetadataRow = {
  yearsExp: number | null
  /** Sleeper's player_id when present; useful for diagnostics. */
  sleeperId?: string | null
}

export type NflRookieLookup = {
  /** Look up by `<normalized lowercase name>|<uppercase position>`. */
  byNamePos: Map<string, RookieMetadataRow>
  /** Loose fallback by `<normalized lowercase name>` when position is missing/unknown. */
  byName: Map<string, RookieMetadataRow>
  /** True when the upstream Sleeper fetch returned at least one usable years_exp record. */
  hasData: boolean
}

function normName(name: string | null | undefined): string {
  return String(name ?? '').trim().toLowerCase()
}

function normPos(pos: string | null | undefined): string {
  return String(pos ?? '').trim().toUpperCase()
}

/**
 * Build a lookup table from Sleeper's NFL player cache. Returns a snapshot —
 * callers should not mutate it. Cheap when the Sleeper cache is warm
 * (24h TTL, in-process).
 */
export async function loadNflRookieLookup(): Promise<NflRookieLookup> {
  let players: Record<string, SleeperPlayer> = {}
  try {
    players = await getAllPlayers()
  } catch {
    return { byNamePos: new Map(), byName: new Map(), hasData: false }
  }

  const byNamePos = new Map<string, RookieMetadataRow>()
  const byName = new Map<string, RookieMetadataRow>()
  let hasData = false

  for (const sp of Object.values(players)) {
    const fullName = sp.full_name || `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim()
    const nameKey = normName(fullName)
    const posKey = normPos(sp.position)
    if (!nameKey) continue

    const yearsExpRaw = (sp as { years_exp?: number }).years_exp
    if (yearsExpRaw == null || !Number.isFinite(Number(yearsExpRaw))) continue
    const yearsExp = Number(yearsExpRaw)
    hasData = true

    const row: RookieMetadataRow = { yearsExp, sleeperId: sp.player_id ?? null }
    const compoundKey = `${nameKey}|${posKey}`
    if (!byNamePos.has(compoundKey)) byNamePos.set(compoundKey, row)
    if (!byName.has(nameKey)) byName.set(nameKey, row)
  }

  return { byNamePos, byName, hasData }
}

/**
 * Resolve `years_exp` for a single (name, position) pair using a prebuilt
 * lookup. Returns `null` when no record matches — caller should treat that as
 * "rookie data unavailable for this row".
 */
export function lookupYearsExp(
  lookup: NflRookieLookup,
  name: string | null | undefined,
  position: string | null | undefined,
): number | null {
  const nameKey = normName(name)
  if (!nameKey) return null
  const posKey = normPos(position)
  const compoundHit = posKey ? lookup.byNamePos.get(`${nameKey}|${posKey}`) : undefined
  if (compoundHit) return compoundHit.yearsExp
  const nameHit = lookup.byName.get(nameKey)
  return nameHit?.yearsExp ?? null
}
