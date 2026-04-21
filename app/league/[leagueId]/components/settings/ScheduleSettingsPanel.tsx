'use client'

import { useEffect, useState } from 'react'
import { SettingsPanelHeading, SettingsSectionLabel, SettingsHelper, controlClass } from './settings-ui'

function readScheduleSlice(snapshot: Record<string, unknown>) {
  const raw = snapshot.scheduleSettings
  return raw && typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

export function ScheduleSettingsPanel({
  settingsSnapshot,
  canEdit,
  debouncedSave,
}: {
  settingsSnapshot: Record<string, unknown>
  canEdit: boolean
  debouncedSave: (partial: Record<string, unknown>) => void
}) {
  const disabled = !canEdit
  const slice = readScheduleSlice(settingsSnapshot)
  const [regularSeasonWeeks, setRegularSeasonWeeks] = useState<number>(
    typeof slice.regularSeasonWeeks === 'number' ? slice.regularSeasonWeeks : 14,
  )
  const [byeWeeksNote, setByeWeeksNote] = useState<string>(
    typeof slice.byeWeeksNote === 'string' ? slice.byeWeeksNote : '',
  )

  useEffect(() => {
    const s = readScheduleSlice(settingsSnapshot)
    setRegularSeasonWeeks(typeof s.regularSeasonWeeks === 'number' ? s.regularSeasonWeeks : 14)
    setByeWeeksNote(typeof s.byeWeeksNote === 'string' ? s.byeWeeksNote : '')
  }, [settingsSnapshot])

  const mergeSchedule = (next: Record<string, unknown>) => {
    const prev = readScheduleSlice(settingsSnapshot)
    return {
      settingsMerge: {
        scheduleSettings: {
          ...prev,
          ...next,
        },
      },
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-8 px-6 py-6 text-[13px] text-white/85" data-testid="settings-schedule-panel">
      <SettingsPanelHeading
        title="Schedule settings"
        subtitle="Regular season shape and notes stored on the league JSON snapshot. Pair with playoff settings for full bracket timing."
      />

      <div>
        <SettingsSectionLabel>Regular season weeks</SettingsSectionLabel>
        <select
          className={controlClass}
          disabled={disabled}
          value={regularSeasonWeeks}
          onChange={(e) => {
            const n = Number(e.target.value)
            setRegularSeasonWeeks(n)
            debouncedSave(mergeSchedule({ regularSeasonWeeks: n }))
          }}
        >
          {Array.from({ length: 9 }, (_, i) => i + 10).map((n) => (
            <option key={n} value={n}>
              {n} weeks
            </option>
          ))}
        </select>
        <SettingsHelper>
          Drives regular-season length in schedule/matchup cadence resolvers (merged with sport defaults when unset).
        </SettingsHelper>
      </div>

      <div>
        <SettingsSectionLabel>Bye / schedule notes (optional)</SettingsSectionLabel>
        <textarea
          className={`${controlClass} min-h-[88px] max-w-lg rounded-2xl py-3`}
          disabled={disabled}
          value={byeWeeksNote}
          placeholder="e.g. NFL Week 14 bye handling, custom holiday blackout…"
          onChange={(e) => {
            const v = e.target.value
            setByeWeeksNote(v)
            debouncedSave(mergeSchedule({ byeWeeksNote: v }))
          }}
        />
      </div>
    </div>
  )
}
