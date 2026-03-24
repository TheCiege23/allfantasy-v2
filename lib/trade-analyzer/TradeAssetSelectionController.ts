/**
 * TradeAssetSelectionController — add/remove asset helpers and validation for trade builder.
 */

export type AssetLike = { id: string; name: string; type?: string }

export function addPlayerSlot<T>(assets: T[], newSlot: T): T[] {
  return [...assets, newSlot]
}

export function removeAssetAtIndex<T>(assets: T[], index: number): T[] {
  if (index < 0 || index >= assets.length) return assets
  return assets.filter((_, i) => i !== index)
}

export function removeAssetById<T extends AssetLike>(assets: T[], id: string): T[] {
  return assets.filter((a) => (a as AssetLike).id !== id)
}

export function canSubmitTrade(teamAPlayerCount: number, teamBPlayerCount: number, requireBothSides: boolean): boolean {
  if (!requireBothSides) return teamAPlayerCount > 0 || teamBPlayerCount > 0
  return teamAPlayerCount > 0 && teamBPlayerCount > 0
}

export function getNamedPlayerCount(players: Array<{ name?: string }>): number {
  return players.filter((p) => String(p?.name ?? "").trim()).length
}

export function getNamedPickCount(
  picks: Array<{ year?: string | number; round?: string | number }>
): number {
  return picks.filter((pick) => {
    const year = String(pick?.year ?? "").trim()
    const round = String(pick?.round ?? "").trim()
    return year.length > 0 && round.length > 0
  }).length
}

export function getTotalTradeAssetCount(
  players: Array<{ name?: string }>,
  picks: Array<{ year?: string | number; round?: string | number }>,
  faab = 0
): number {
  return getNamedPlayerCount(players) + getNamedPickCount(picks) + (faab > 0 ? 1 : 0)
}

export function canSubmitTradeByAssets(
  teamAAssetCount: number,
  teamBAssetCount: number,
  requireBothSides: boolean
): boolean {
  if (!requireBothSides) return teamAAssetCount > 0 || teamBAssetCount > 0
  return teamAAssetCount > 0 && teamBAssetCount > 0
}
