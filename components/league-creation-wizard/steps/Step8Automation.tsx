'use client'

import type { LeagueCreationWizardState, WizardAutomationSettings } from '@/lib/league-creation-wizard/types'

export type Step8AutomationProps = {
  state: LeagueCreationWizardState
  onAutomationChange: (patch: Partial<WizardAutomationSettings>) => void
  onBack: () => void
  onNext: () => void
}

export function Step8Automation({ state, onAutomationChange, onBack, onNext }: Step8AutomationProps) {
  const a = state.automationSettings
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Automation</h2>
      <p className="text-sm text-white/70">Notifications and draft behavior.</p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.draftNotificationsEnabled}
            onChange={(e) => onAutomationChange({ draftNotificationsEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">Draft notifications — on-the-clock, pause, etc.</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.autopickFromQueueEnabled}
            onChange={(e) => onAutomationChange({ autopickFromQueueEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">Autopick from queue when timer expires</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={a.slowDraftRemindersEnabled}
            onChange={(e) => onAutomationChange({ slowDraftRemindersEnabled: e.target.checked })}
            className="rounded border-white/30 bg-gray-900"
          />
          <span className="text-sm text-white/90">Slow draft reminders</span>
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
