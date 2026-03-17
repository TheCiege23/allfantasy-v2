'use client'

import { Label } from '@/components/ui/label'
import type { LeagueCreationWizardState, WizardAISettings } from '@/lib/league-creation-wizard/types'

export type Step7AISettingsProps = {
  state: LeagueCreationWizardState
  onAISettingsChange: (patch: Partial<WizardAISettings>) => void
  onBack: () => void
  onNext: () => void
}

export function Step7AISettings({ state, onAISettingsChange, onBack, onNext }: Step7AISettingsProps) {
  const a = state.aiSettings
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">AI settings</h2>
      <p className="text-sm text-white/70">Optional AI features for draft and orphan teams.</p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.aiAdpEnabled}
            onChange={(e) => onAISettingsChange({ aiAdpEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">AI ADP — use AI-computed ADP in draft room</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.orphanTeamAiManagerEnabled}
            onChange={(e) => onAISettingsChange({ orphanTeamAiManagerEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">Orphan AI manager — auto-pick for empty teams</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.draftHelperEnabled}
            onChange={(e) => onAISettingsChange({ draftHelperEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">Draft helper — recommendations and queue reorder</span>
        </label>
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
