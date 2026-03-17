'use client'

import type { WizardAutomationSettings } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type AutomationSettingsPanelProps = {
  value: WizardAutomationSettings
  onChange: (patch: Partial<WizardAutomationSettings>) => void
}

/**
 * Draft notifications, autopick from queue, slow draft reminders. Optional; good defaults below.
 */
export function AutomationSettingsPanel({ value, onChange }: AutomationSettingsPanelProps) {
  const a = value
  return (
    <div className="space-y-5">
      <StepHeader
        title="Automation"
        description="Optional — good defaults below. Control notifications and auto-pick behavior; change anytime in draft settings."
        help={
          <>
            <strong>Draft notifications</strong> — Alert managers when they're on the clock. <strong>Autopick from queue</strong> — When the timer runs out, pick the first player in their queue. <strong>Slow draft reminders</strong> — Nudge managers in slow drafts.
          </>
        }
        helpTitle="Automation options explained"
      />
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer" title="Notify when on the clock, draft paused, etc.">
          <input
            type="checkbox"
            checked={a.draftNotificationsEnabled}
            onChange={(e) => onChange({ draftNotificationsEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="notif-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Draft notifications</span>
            <p id="notif-help" className="text-xs text-white/50 mt-0.5">Notify managers when they're on the clock, when draft is paused, etc.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer" title="When timer expires, pick first in queue">
          <input
            type="checkbox"
            checked={a.autopickFromQueueEnabled}
            onChange={(e) => onChange({ autopickFromQueueEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="autopick-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Autopick from queue</span>
            <p id="autopick-help" className="text-xs text-white/50 mt-0.5">When the timer expires, use the first player in the manager's queue.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer" title="Remind managers in slow drafts">
          <input
            type="checkbox"
            checked={a.slowDraftRemindersEnabled}
            onChange={(e) => onChange({ slowDraftRemindersEnabled: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="slow-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Slow draft reminders</span>
            <p id="slow-help" className="text-xs text-white/50 mt-0.5">Send reminders for slow drafts so picks keep moving.</p>
          </div>
        </label>
      </div>
    </div>
  )
}
