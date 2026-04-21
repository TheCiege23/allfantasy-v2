'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import { SettingsPanelHeading, SettingsSectionLabel, SettingsHelper, SettingsToggleRow, controlClass } from './settings-ui'

export function TradeSettingsPanel({
  initialData,
  canEdit,
  debouncedSave,
  save,
}: {
  initialData: CommissionerSettingsFormData
  canEdit: boolean
  debouncedSave: (partial: Record<string, unknown>) => void
  save: (partial: Record<string, unknown>) => Promise<void>
}) {
  const disabled = !canEdit
  const [reviewHours, setReviewHours] = useState(initialData.tradeReviewHours ?? 24)
  const [deadlineWeek, setDeadlineWeek] = useState(initialData.tradeDeadlineWeek ?? 12)
  const [pickTrading, setPickTrading] = useState(Boolean(initialData.draftPickTrading))

  useEffect(() => {
    setReviewHours(initialData.tradeReviewHours ?? 24)
    setDeadlineWeek(initialData.tradeDeadlineWeek ?? 12)
    setPickTrading(Boolean(initialData.draftPickTrading))
  }, [initialData])

  return (
    <div className="min-h-0 flex-1 space-y-8 px-6 py-6 text-[13px] text-white/85" data-testid="settings-trade-panel">
      <SettingsPanelHeading
        title="Trade settings"
        subtitle="Review window, deadline, and draft pick trading. Enforcement uses the active trade engine."
      />

      <div>
        <SettingsSectionLabel>Time to review pending trades (hours)</SettingsSectionLabel>
        <select
          className={controlClass}
          disabled={disabled}
          value={reviewHours}
          onChange={(e) => {
            const n = Number(e.target.value)
            setReviewHours(n)
            debouncedSave({ tradeReviewHours: n })
          }}
        >
          {[0, 6, 12, 24, 48, 72].map((h) => (
            <option key={h} value={h}>
              {h === 0 ? 'None (instant processing)' : `${h} hours`}
            </option>
          ))}
        </select>
        <SettingsHelper>League vote or commissioner review window before trades process.</SettingsHelper>
      </div>

      <div>
        <SettingsSectionLabel>Trade deadline (week)</SettingsSectionLabel>
        <select
          className={controlClass}
          disabled={disabled}
          value={deadlineWeek}
          onChange={(e) => {
            const n = Number(e.target.value)
            setDeadlineWeek(n)
            debouncedSave({ tradeDeadlineWeek: n })
          }}
        >
          {Array.from({ length: 14 }, (_, i) => i + 4).map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
      </div>

      <SettingsToggleRow
        label="Allow draft pick trading"
        description="When enabled, teams can trade future draft picks where your league rules allow."
        checked={pickTrading}
        disabled={disabled}
        onChange={(v) => {
          setPickTrading(v)
          void save({ draftPickTrading: v })
        }}
      />
    </div>
  )
}
