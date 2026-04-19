import type { ClearSportsSport } from '@/lib/clear-sports'

/**
 * Build a lookup from ClearSports projection rows (shape varies by endpoint).
 * Keys: lowercase player name, optional id fields.
 */
export function indexClearSportsProjections(
  rows: Array<Record<string, unknown>>,
  sport: ClearSportsSport,
): {
  byName: Map<string, Record<string, unknown>>
  byId: Map<string, Record<string, unknown>>
} {
  const byName = new Map<string, Record<string, unknown>>()
  const byId = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const nameRaw =
      (typeof row.name === 'string' && row.name) ||
      (typeof row.playerName === 'string' && row.playerName) ||
      (typeof row.fullName === 'string' && row.fullName) ||
      (typeof row.player === 'string' && row.player) ||
      null
    const idRaw =
      (typeof row.playerId === 'string' && row.playerId) ||
      (typeof row.id === 'string' && row.id) ||
      (typeof row.player_id === 'string' && row.player_id) ||
      (typeof row.externalId === 'string' && row.externalId) ||
      null

    if (nameRaw) byName.set(nameRaw.trim().toLowerCase(), row)
    if (idRaw) byId.set(String(idRaw).trim(), row)
  }

  void sport
  return { byName, byId }
}

export function pickProjectionRowForPlayer(args: {
  name: string
  externalId?: string | null
  index: { byName: Map<string, Record<string, unknown>>; byId: Map<string, Record<string, unknown>> }
}): Record<string, unknown> | null {
  if (args.externalId) {
    const hit = args.index.byId.get(args.externalId.trim())
    if (hit) return hit
  }
  return args.index.byName.get(args.name.trim().toLowerCase()) ?? null
}
