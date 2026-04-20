import type { MatchupCenterPayload, MatchupPlayerSlot } from '@/lib/matchup-center/types'

export function assertValidMatchupPayload(p: MatchupCenterPayload): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!p.leagueId?.trim()) errors.push('leagueId required')
  if (!Number.isFinite(p.season)) errors.push('season invalid')
  if (!Number.isFinite(p.week) || p.week < 1) errors.push('week invalid')
  if (!Number.isFinite(p.refreshIntervalMs) || p.refreshIntervalMs < 0) errors.push('refreshIntervalMs invalid')
  if (!p.insights?.swingPlayers?.length) errors.push('insights.swingPlayers required')
  if (!p.insights?.riskLevel) errors.push('insights.riskLevel required')
  if (!p.insights?.floorVsCeiling?.trim()) errors.push('insights.floorVsCeiling required')
  if (!p.left?.rosterId || !p.right?.rosterId) errors.push('both sides require rosterId')
  const dup = new Set<string>()
  for (const side of [p.left, p.right]) {
    for (const s of side.starters) {
      const k = `${side.rosterId}:${s.playerId}`
      if (dup.has(k)) errors.push(`duplicate starter ${k}`)
      dup.add(k)
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}

export function sanitizeStarterRow(slot: MatchupPlayerSlot): MatchupPlayerSlot {
  return {
    ...slot,
    name: slot.name?.trim() || 'Player',
    currentPoints: Number.isFinite(slot.currentPoints) ? slot.currentPoints : 0,
    projectedPoints: Number.isFinite(slot.projectedPoints) ? slot.projectedPoints : 0,
  }
}
