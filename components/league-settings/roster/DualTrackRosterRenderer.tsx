import { RosterSectionRenderer } from './RosterSectionRenderer'
import type { SlotDef, UnifiedRosterSection } from './types'

export function DualTrackRosterRenderer({
  slotDefs,
  pendingSlots,
  sections,
  isCommissioner,
  onAdjust,
}: {
  slotDefs: SlotDef[]
  pendingSlots: Record<string, number>
  sections: UnifiedRosterSection[]
  isCommissioner: boolean
  onAdjust: (key: string, delta: number) => void
}) {
  if (!sections || sections.length === 0) {
    return (
      <RosterSectionRenderer
        slotDefs={slotDefs}
        pendingSlots={pendingSlots}
        isCommissioner={isCommissioner}
        onAdjust={onAdjust}
      />
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <RosterSectionRenderer
          key={section.key}
          title={section.label}
          slotDefs={slotDefs}
          pendingSlots={pendingSlots}
          isCommissioner={isCommissioner}
          slotKeyFilter={new Set(Object.keys(section.slots))}
          onAdjust={onAdjust}
        />
      ))}
    </div>
  )
}
