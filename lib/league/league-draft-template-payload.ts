/**
 * Single resolved template payload for draft flows — same source as pool + roster gates.
 * Use this instead of ad hoc `getRosterTemplateForLeague` in pick validation / autopick.
 */

import type { LeagueSport } from '@prisma/client'
import type { RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'
import { getEffectiveLeagueRosterTemplate } from '@/lib/league/getEffectiveLeagueRosterTemplate'

function totalRosterSlotsFromTemplate(template: RosterTemplateDto): number {
  let n = 0
  for (const s of template.slots) {
    n +=
      (s.starterCount ?? 0) +
      (s.benchCount ?? 0) +
      (s.reserveCount ?? 0) +
      (s.taxiCount ?? 0) +
      (s.devyCount ?? 0)
  }
  return n
}

export type LeagueDraftTemplatePayload = {
  leagueId: string
  sport: LeagueSport
  formatType: string
  hasPersistedRosterSchema: boolean
  /** Full roster union — bench/IR/taxi rows included. Use for capacity only, not draft targeting. */
  allowedPositions: ReadonlySet<string>
  /** Starter/flex starter paths only — same basis as draft pool filtering. */
  starterEligiblePositions: ReadonlySet<string>
  totalRosterSlots: number
  template: RosterTemplateDto
}

/**
 * Positions allowed for draft decisions (autopick, queue, pool, pick validation): starter-eligible union,
 * or full {@link LeagueDraftTemplatePayload.allowedPositions} when the starter set is empty (degenerate template).
 */
export function getDraftEligiblePositionsFromPayload(payload: LeagueDraftTemplatePayload): Set<string> {
  if (payload.starterEligiblePositions.size > 0) {
    return new Set(payload.starterEligiblePositions)
  }
  return new Set(payload.allowedPositions)
}

/**
 * One league template per request — aligns pool eligibility, pick validation, and queue filtering.
 */
export async function getLeagueDraftTemplatePayload(leagueId: string): Promise<LeagueDraftTemplatePayload> {
  const e = await getEffectiveLeagueRosterTemplate(leagueId)
  return {
    leagueId: e.leagueId,
    sport: e.sport,
    formatType: e.formatType,
    hasPersistedRosterSchema: e.hasPersistedRosterSchema,
    allowedPositions: e.allowedPositions,
    starterEligiblePositions: e.starterEligiblePositions,
    totalRosterSlots: totalRosterSlotsFromTemplate(e.template),
    template: e.template,
  }
}

/**
 * Flat slot labels in template order (starters, then bench/IR/taxi/devy per slot row) for draft UI / AI roster context.
 */
export function orderedSlotLabelsFromTemplate(template: RosterTemplateDto): string[] {
  const sorted = [...template.slots].sort((a, b) => (a.slotOrder ?? 0) - (b.slotOrder ?? 0))
  const out: string[] = []
  for (const s of sorted) {
    const label = String(s.slotName ?? '').trim().toUpperCase() || 'SLOT'
    for (let i = 0; i < Math.max(0, s.starterCount ?? 0); i++) out.push(label)
    for (let i = 0; i < Math.max(0, s.benchCount ?? 0); i++) out.push('BN')
    for (let i = 0; i < Math.max(0, s.reserveCount ?? 0); i++) out.push('IR')
    for (let i = 0; i < Math.max(0, s.taxiCount ?? 0); i++) out.push('TAXI')
    for (let i = 0; i < Math.max(0, s.devyCount ?? 0); i++) out.push('DEVY')
  }
  return out
}
