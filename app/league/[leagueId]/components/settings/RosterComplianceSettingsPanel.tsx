'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import {
  SettingsPanelHeading,
  SettingsSectionLabel,
  SettingsHelper,
  SettingsToggleRow,
  controlClass,
  controlClassSm,
} from './settings-ui'

export function RosterComplianceSettingsPanel({
  initialData,
  canEdit,
  debouncedSave,
}: {
  initialData: CommissionerSettingsFormData
  canEdit: boolean
  debouncedSave: (partial: Record<string, unknown>) => void
}) {
  const disabled = !canEdit
  const [rosterSize, setRosterSize] = useState(initialData.rosterSize ?? 16)
  const [irSlots, setIrSlots] = useState(initialData.irSlots ?? 1)
  const [taxiSlots, setTaxiSlots] = useState(initialData.taxiSlots ?? 0)
  const [taxiNonRookies, setTaxiNonRookies] = useState(Boolean(initialData.taxiAllowNonRookies))
  const [taxiYears, setTaxiYears] = useState(initialData.taxiYearsLimit ?? 2)
  const [taxiDeadline, setTaxiDeadline] = useState(initialData.taxiDeadlineWeek ?? 4)
  const [irOut, setIrOut] = useState(Boolean(initialData.irAllowOut))
  const [irCovid, setIrCovid] = useState(Boolean(initialData.irAllowCovid))
  const [irSus, setIrSus] = useState(Boolean(initialData.irAllowSuspended))
  const [irNa, setIrNa] = useState(Boolean(initialData.irAllowNA))
  const [irDnr, setIrDnr] = useState(Boolean(initialData.irAllowDNR))
  const [irDoub, setIrDoub] = useState(Boolean(initialData.irAllowDoubtful))

  useEffect(() => {
    setRosterSize(initialData.rosterSize ?? 16)
    setIrSlots(initialData.irSlots ?? 1)
    setTaxiSlots(initialData.taxiSlots ?? 0)
    setTaxiNonRookies(Boolean(initialData.taxiAllowNonRookies))
    setTaxiYears(initialData.taxiYearsLimit ?? 2)
    setTaxiDeadline(initialData.taxiDeadlineWeek ?? 4)
    setIrOut(Boolean(initialData.irAllowOut))
    setIrCovid(Boolean(initialData.irAllowCovid))
    setIrSus(Boolean(initialData.irAllowSuspended))
    setIrNa(Boolean(initialData.irAllowNA))
    setIrDnr(Boolean(initialData.irAllowDNR))
    setIrDoub(Boolean(initialData.irAllowDoubtful))
  }, [initialData])

  return (
    <div className="min-h-0 flex-1 space-y-8 px-6 py-6 text-[13px] text-white/85" data-testid="settings-roster-panel">
      <SettingsPanelHeading
        title="Roster settings"
        subtitle="Roster size, IR eligibility, and taxi squad rules feed the legality engine and lineup locks."
      />

      <div>
        <SettingsSectionLabel>Max roster size</SettingsSectionLabel>
        <select
          className={controlClassSm}
          disabled={disabled}
          value={rosterSize}
          onChange={(e) => {
            const n = Number(e.target.value)
            setRosterSize(n)
            debouncedSave({ rosterSize: n })
          }}
        >
          {Array.from({ length: 21 }, (_, i) => i + 10).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <SettingsSectionLabel>Injured reserve slots</SettingsSectionLabel>
        <select
          className={controlClassSm}
          disabled={disabled}
          value={irSlots}
          onChange={(e) => {
            const n = Number(e.target.value)
            setIrSlots(n)
            debouncedSave({ irSlots: n })
          }}
        >
          {Array.from({ length: 7 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <SettingsSectionLabel>IR eligibility</SettingsSectionLabel>
        <div className="space-y-2">
          <SettingsToggleRow label="Allow OUT players on IR" checked={irOut} disabled={disabled} onChange={(v) => { setIrOut(v); debouncedSave({ irAllowOut: v }) }} />
          <SettingsToggleRow label="Allow COVID / PUP designation on IR" checked={irCovid} disabled={disabled} onChange={(v) => { setIrCovid(v); debouncedSave({ irAllowCovid: v }) }} />
          <SettingsToggleRow label="Allow suspended players on IR" checked={irSus} disabled={disabled} onChange={(v) => { setIrSus(v); debouncedSave({ irAllowSuspended: v }) }} />
          <SettingsToggleRow label="Allow NA players on IR" checked={irNa} disabled={disabled} onChange={(v) => { setIrNa(v); debouncedSave({ irAllowNA: v }) }} />
          <SettingsToggleRow label="Allow DNR / holdout / opt-out on IR" checked={irDnr} disabled={disabled} onChange={(v) => { setIrDnr(v); debouncedSave({ irAllowDNR: v }) }} />
          <SettingsToggleRow label="Allow doubtful players on IR" checked={irDoub} disabled={disabled} onChange={(v) => { setIrDoub(v); debouncedSave({ irAllowDoubtful: v }) }} />
        </div>
      </div>

      <div>
        <SettingsSectionLabel>Taxi squad slots</SettingsSectionLabel>
        <select
          className={controlClassSm}
          disabled={disabled}
          value={taxiSlots}
          onChange={(e) => {
            const n = Number(e.target.value)
            setTaxiSlots(n)
            debouncedSave({ taxiSlots: n })
          }}
        >
          {Array.from({ length: 7 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <SettingsToggleRow
        label="Allow non-rookies on taxi"
        checked={taxiNonRookies}
        disabled={disabled}
        onChange={(v) => {
          setTaxiNonRookies(v)
          debouncedSave({ taxiAllowNonRookies: v })
        }}
      />

      <div>
        <SettingsSectionLabel>Taxi years experience limit</SettingsSectionLabel>
        <select
          className={controlClassSm}
          disabled={disabled}
          value={taxiYears}
          onChange={(e) => {
            const n = Number(e.target.value)
            setTaxiYears(n)
            debouncedSave({ taxiYearsLimit: n })
          }}
        >
          <option value={0}>No max</option>
          <option value={1}>1 year</option>
          <option value={2}>2 years</option>
          <option value={3}>3 years</option>
        </select>
      </div>

      <div>
        <SettingsSectionLabel>Taxi deadline (week)</SettingsSectionLabel>
        <select
          className={controlClassSm}
          disabled={disabled}
          value={taxiDeadline}
          onChange={(e) => {
            const n = Number(e.target.value)
            setTaxiDeadline(n)
            debouncedSave({ taxiDeadlineWeek: n })
          }}
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <SettingsHelper>After this week, taxi promotions follow your league&apos;s promotion rules.</SettingsHelper>
      </div>
    </div>
  )
}
