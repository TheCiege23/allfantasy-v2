/**
 * WaiverClaimFlowController — claim submit validation and FAAB/priority normalization.
 */

export function clampFaabBid(bid: number, remaining: number | null): number {
  if (remaining == null) return Math.max(0, bid)
  return Math.max(0, Math.min(bid, remaining))
}

export function normalizePriorityOrder(value: string): number | null {
  const n = Number(value)
  if (value.trim() === "" || Number.isNaN(n)) return null
  return Math.max(0, Math.floor(n))
}

export function canSubmitClaim(opts: {
  dropPlayerId: string | null
  rosterPlayerIds: string[]
  hasOpenRosterSpot: boolean
}): { valid: boolean; reason?: string } {
  const { dropPlayerId, rosterPlayerIds, hasOpenRosterSpot } = opts
  if (hasOpenRosterSpot) return { valid: true }
  if (rosterPlayerIds.length === 0) return { valid: false, reason: "Roster not loaded." }
  if (!dropPlayerId?.trim()) return { valid: false, reason: "Roster is full. Choose a player to drop." }
  if (!rosterPlayerIds.includes(dropPlayerId)) return { valid: false, reason: "Selected drop player is not on your roster." }
  return { valid: true }
}

export function getClaimSummary(addName: string, dropName: string | null, faabBid: number | null): string {
  const parts = [addName]
  if (dropName) parts.push(`drop ${dropName}`)
  if (faabBid != null && faabBid > 0) parts.push(`$${faabBid} FAAB`)
  return parts.join(" · ")
}
