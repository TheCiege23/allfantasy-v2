/**
 * Player identity resolver — maps provider-specific player IDs to canonical identity.
 * Reads from PlayerIdentityMap (which bridges Sleeper, FantasyCalc, RI, API-Sports, etc.).
 * Never throws — returns null if identity cannot be resolved.
 */
import "server-only"
import { prisma } from "@/lib/prisma"

export type ResolvedPlayerIdentity = {
  canonicalName: string
  normalizedName: string
  sleeperId: string | null
  fantasyCalcId: string | null
  rollingInsightsId: string | null
  apiSportsId: string | null
  mflId: string | null
  espnId: string | null
  fleaflickerId: string | null
  clearSportsId: string | null
}

export type PlayerIdentityLookupKey =
  | { by: "sleeperId"; value: string }
  | { by: "apiSportsId"; value: string }
  | { by: "name"; value: string; sport?: string }
  | { by: "espnId"; value: string }
  | { by: "rollingInsightsId"; value: string }

function normalizeForLookup(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
}

export async function resolvePlayerIdentity(
  key: PlayerIdentityLookupKey,
): Promise<ResolvedPlayerIdentity | null> {
  try {
    const identityMap = (prisma as any).playerIdentityMap
    if (!identityMap) return null

    let where: Record<string, unknown>
    switch (key.by) {
      case "sleeperId":
        where = { sleeperId: key.value }
        break
      case "apiSportsId":
        where = { apiSportsId: key.value }
        break
      case "espnId":
        where = { espnId: key.value }
        break
      case "rollingInsightsId":
        where = { rollingInsightsId: key.value }
        break
      case "name": {
        const norm = normalizeForLookup(key.value)
        where = { normalizedName: norm }
        break
      }
    }

    const row = await identityMap.findFirst({ where })
    if (!row) return null

    return {
      canonicalName: String(row.canonicalName ?? ""),
      normalizedName: String(row.normalizedName ?? ""),
      sleeperId: row.sleeperId ? String(row.sleeperId) : null,
      fantasyCalcId: row.fantasyCalcId ? String(row.fantasyCalcId) : null,
      rollingInsightsId: row.rollingInsightsId ? String(row.rollingInsightsId) : null,
      apiSportsId: row.apiSportsId ? String(row.apiSportsId) : null,
      mflId: row.mflId ? String(row.mflId) : null,
      espnId: row.espnId ? String(row.espnId) : null,
      fleaflickerId: row.fleaflickerId ? String(row.fleaflickerId) : null,
      clearSportsId: row.clearSportsId ? String(row.clearSportsId) : null,
    }
  } catch {
    return null
  }
}

export async function resolvePlayerIdentityBatch(
  names: string[],
): Promise<Map<string, ResolvedPlayerIdentity>> {
  const result = new Map<string, ResolvedPlayerIdentity>()
  if (names.length === 0) return result

  try {
    const identityMap = (prisma as any).playerIdentityMap
    if (!identityMap) return result

    const normalized = names.map(normalizeForLookup)
    const rows = await identityMap.findMany({
      where: { normalizedName: { in: normalized } },
    })

    for (const row of rows) {
      result.set(String(row.normalizedName ?? ""), {
        canonicalName: String(row.canonicalName ?? ""),
        normalizedName: String(row.normalizedName ?? ""),
        sleeperId: row.sleeperId ? String(row.sleeperId) : null,
        fantasyCalcId: row.fantasyCalcId ? String(row.fantasyCalcId) : null,
        rollingInsightsId: row.rollingInsightsId ? String(row.rollingInsightsId) : null,
        apiSportsId: row.apiSportsId ? String(row.apiSportsId) : null,
        mflId: row.mflId ? String(row.mflId) : null,
        espnId: row.espnId ? String(row.espnId) : null,
        fleaflickerId: row.fleaflickerId ? String(row.fleaflickerId) : null,
        clearSportsId: row.clearSportsId ? String(row.clearSportsId) : null,
      })
    }
  } catch {
    // ignore — return partial map
  }

  return result
}
