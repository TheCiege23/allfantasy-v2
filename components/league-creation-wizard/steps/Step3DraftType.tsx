'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DRAFT_TYPE_LABELS,
  getAllowedDraftTypesForLeagueType,
} from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueCreationWizardState, DraftTypeId } from '@/lib/league-creation-wizard/types'

export type Step3DraftTypeProps = {
  state: LeagueCreationWizardState
  onDraftTypeChange: (draftType: DraftTypeId) => void
  onBack: () => void
  onNext: () => void
}

export function Step3DraftType({ state, onDraftTypeChange, onBack, onNext }: Step3DraftTypeProps) {
  const allowed = getAllowedDraftTypesForLeagueType(state.leagueType)
  const value = allowed.includes(state.draftType) ? state.draftType : allowed[0]
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Draft type</h2>
      <p className="text-sm text-white/70">How your league will draft. Integrates with the live draft engine.</p>
      <div>
        <Label className="text-white/90">Type</Label>
        <Select
          value={value}
          onValueChange={(v) => onDraftTypeChange(v as DraftTypeId)}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((id) => (
              <SelectItem key={id} value={id}>
                {DRAFT_TYPE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-between gap-2">
        <button type="button" onClick={onBack} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation">
          Back
        </button>
        <button type="button" onClick={onNext} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 min-h-[44px] touch-manipulation">
          Next
        </button>
      </div>
    </section>
  )
}
