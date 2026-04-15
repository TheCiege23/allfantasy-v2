import type { RosterTemplateDto } from '@/lib/multi-sport/RosterTemplateService'

export type ExpandedStarterSlot = {
  index: number
  label: string
  allowedPositions: string[]
  isFlexible: boolean
}

/**
 * Flatten template slots into one entry per starter position (QB, RB1, RB2, FLEX, …).
 */
export function expandStarterSlots(template: RosterTemplateDto): ExpandedStarterSlot[] {
  const sorted = [...template.slots].sort((a, b) => a.slotOrder - b.slotOrder)
  const out: ExpandedStarterSlot[] = []
  let idx = 0
  for (const slot of sorted) {
    const n = Math.max(0, slot.starterCount ?? 0)
    const countInTemplate = sorted.filter((s) => s.slotName === slot.slotName).reduce((s, x) => s + (x.starterCount ?? 0), 0)
    for (let i = 0; i < n; i++) {
      const label =
        n > 1 || countInTemplate > 1 ? `${slot.slotName}${i + 1}` : slot.slotName
      out.push({
        index: idx++,
        label,
        allowedPositions: [...(slot.allowedPositions ?? [])],
        isFlexible: Boolean(slot.isFlexibleSlot),
      })
    }
  }
  return out
}
