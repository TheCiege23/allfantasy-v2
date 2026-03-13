/**
 * Roster playerData helpers (multi-sport). playerData may be string[] or { players: string[] }.
 */

export function getRosterPlayerIds(playerData: unknown): string[] {
  if (Array.isArray(playerData)) {
    return (playerData as unknown[]).map((p) => (typeof p === "string" ? p : (p as any)?.id ?? (p as any)?.player_id ?? String(p))).filter(Boolean)
  }
  const players = (playerData as any)?.players
  return Array.isArray(players) ? players.map((p: any) => typeof p === "string" ? p : p?.id ?? p?.player_id ?? String(p)).filter(Boolean) : []
}

export function rosterContainsPlayer(playerData: unknown, playerId: string): boolean {
  return getRosterPlayerIds(playerData).includes(playerId)
}

export function addPlayerToRosterData(playerData: unknown, playerId: string): unknown {
  const ids = getRosterPlayerIds(playerData)
  if (ids.includes(playerId)) return playerData
  if (Array.isArray(playerData)) return [...(playerData as string[]), playerId]
  return { ...(playerData as object), players: [...ids, playerId] }
}

export function removePlayerFromRosterData(playerData: unknown, playerId: string): unknown {
  const ids = getRosterPlayerIds(playerData).filter((id) => id !== playerId)
  if (Array.isArray(playerData)) return ids
  return { ...(playerData as object), players: ids }
}

export function getRosterSize(playerData: unknown): number {
  return getRosterPlayerIds(playerData).length
}
