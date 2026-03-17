'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeagueCreationWizardState, WizardPrivacySettings } from '@/lib/league-creation-wizard/types'

const VISIBILITY_OPTS: { value: WizardPrivacySettings['visibility']; label: string }[] = [
  { value: 'private', label: 'Private — only invitees' },
  { value: 'unlisted', label: 'Unlisted — anyone with link' },
  { value: 'public', label: 'Public — discoverable' },
]

export type Step9PrivacyProps = {
  state: LeagueCreationWizardState
  onPrivacyChange: (patch: Partial<WizardPrivacySettings>) => void
  onBack: () => void
  onNext: () => void
}

export function Step9Privacy({ state, onPrivacyChange, onBack, onNext }: Step9PrivacyProps) {
  const p = state.privacySettings
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Privacy & invitations</h2>
      <p className="text-sm text-white/70">Who can see and join your league.</p>
      <div>
        <Label className="text-white/90">Visibility</Label>
        <Select
          value={p.visibility}
          onValueChange={(v) => onPrivacyChange({ visibility: v as WizardPrivacySettings['visibility'] })}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={p.allowInviteLink}
          onChange={(e) => onPrivacyChange({ allowInviteLink: e.target.checked })}
          className="rounded border-white/30 bg-gray-900"
        />
        <span className="text-sm text-white/90">Allow invite link</span>
      </label>
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
