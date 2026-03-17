'use client'

import type { WizardAISettings } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type AISettingsPanelProps = {
  value: WizardAISettings
  onChange: (patch: Partial<WizardAISettings>) => void
}

/**
 * Optional AI features: AI ADP, orphan team manager, draft helper. All optional; good defaults below.
 */
export function AISettingsPanel({ value, onChange }: AISettingsPanelProps) {
  const a = value
  return (
    <div className="space-y-5">
      <StepHeader
        title="AI settings"
        description="Optional — good defaults below. These help during the draft; you can change them anytime in draft settings."
        help={
          <>
            <strong>AI ADP</strong> — Player order in the draft room uses AI-computed rankings. <strong>Orphan AI manager</strong> — Auto-picks for teams with no manager. <strong>Draft helper</strong> — Suggestions and queue reorder. All can be toggled later.
          </>
        }
        helpTitle="AI options explained"
      />
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer" title="Use AI-computed ADP for player order in draft room">
          <input
            type="checkbox"
            checked={a.aiAdpEnabled}
            onChange={(e) => onChange({ aiAdpEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="ai-adp-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">AI ADP</span>
            <p id="ai-adp-help" className="text-xs text-white/50 mt-0.5">Use AI-computed ADP in the draft room for player order.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer" title="Auto-pick for empty teams when on the clock">
          <input
            type="checkbox"
            checked={a.orphanTeamAiManagerEnabled}
            onChange={(e) => onChange({ orphanTeamAiManagerEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="orphan-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Orphan AI manager</span>
            <p id="orphan-help" className="text-xs text-white/50 mt-0.5">Auto-pick for empty teams when they're on the clock.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer" title="Recommendations and queue reorder in draft room">
          <input
            type="checkbox"
            checked={a.draftHelperEnabled}
            onChange={(e) => onChange({ draftHelperEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="helper-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Draft helper</span>
            <p id="helper-help" className="text-xs text-white/50 mt-0.5">Recommendations and queue reorder in the draft room.</p>
          </div>
        </label>
      </div>
    </div>
  )
}
