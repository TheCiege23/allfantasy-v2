'use client'

import { Input } from '@/components/ui/input'
import type { WizardSalaryCapSettings, WizardIdpSettings } from '@/lib/league-creation-wizard/types'

// ===== SALARY CAP SETTINGS PANEL =====

interface SalaryCapSettingsPanelProps {
  settings: WizardSalaryCapSettings
  onChange: (patch: Partial<WizardSalaryCapSettings>) => void
  idpSettings: WizardIdpSettings
  onIdpChange: (patch: Partial<WizardIdpSettings>) => void
  sport: string
}

const DRAFT_MODES: { value: WizardSalaryCapSettings['draftMode']; label: string; desc: string }[] = [
  { value: 'auction', label: 'Auction', desc: 'Bid on players — winning bid = salary' },
  { value: 'snake_salary', label: 'Snake + Salary Scale', desc: 'Pick slot determines salary' },
  { value: 'hybrid', label: 'Hybrid', desc: 'Auction for vets, snake for rookies' },
]

const SALARY_CURVES: { value: WizardSalaryCapSettings['salaryCurve']; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'steep', label: 'Steep' },
  { value: 'exponential', label: 'Aggressive' },
  { value: 'flat', label: 'Flat' },
]

export function SalaryCapSettingsPanel({ settings, onChange, idpSettings, onIdpChange, sport }: SalaryCapSettingsPanelProps) {
  const isNfl = sport.toUpperCase() === 'NFL'
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5">
        <div className="text-sm font-semibold text-white/90">Salary Cap Settings</div>
        <div className="mt-4">
          <label className="mb-2 block text-xs text-white/50">Draft Mode</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {DRAFT_MODES.map((mode) => (
              <button key={mode.value} type="button" onClick={() => onChange({ draftMode: mode.value })}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${settings.draftMode === mode.value ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
                <div className="font-medium">{mode.label}</div>
                <div className="mt-0.5 text-white/40">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Total Cap ($)</label>
            <Input type="number" min={50} max={1000} value={settings.totalCap}
              onChange={(e) => onChange({ totalCap: Number(e.target.value) || 250 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Max Salary ($)</label>
            <Input type="number" min={5} max={200} value={settings.maxSalary}
              onChange={(e) => onChange({ maxSalary: Number(e.target.value) || 45 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Min Salary ($)</label>
            <Input type="number" min={0} max={10} value={settings.minSalary}
              onChange={(e) => onChange({ minSalary: Number(e.target.value) || 1 })} />
          </div>
        </div>
        {(settings.draftMode === 'snake_salary' || settings.draftMode === 'hybrid') && (
          <div className="mt-4">
            <label className="mb-2 block text-xs text-white/50">Salary Curve</label>
            <div className="grid gap-2 grid-cols-4">
              {SALARY_CURVES.map((curve) => (
                <button key={curve.value} type="button" onClick={() => onChange({ salaryCurve: curve.value })}
                  className={`rounded-xl border px-2 py-2 text-xs transition ${settings.salaryCurve === curve.value ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
                  {curve.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/50">Default Contract (yr)</label>
            <Input type="number" min={1} max={5} value={settings.defaultContractYears}
              onChange={(e) => onChange({ defaultContractYears: Number(e.target.value) || 2 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Max Contract (yr)</label>
            <Input type="number" min={1} max={5} value={settings.maxContractYears}
              onChange={(e) => onChange({ maxContractYears: Number(e.target.value) || 5 })} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { key: 'franchiseTagEnabled' as const, label: 'Franchise Tag', checked: settings.franchiseTagEnabled },
            { key: 'deadMoneyEnabled' as const, label: 'Dead Money', checked: settings.deadMoneyEnabled },
            { key: 'capRolloverEnabled' as const, label: 'Cap Rollover', checked: settings.capRolloverEnabled },
            { key: 'capFloorEnabled' as const, label: 'Cap Floor', checked: settings.capFloorEnabled },
          ].map(({ key, label, checked }) => (
            <label key={key} className="flex items-center gap-1.5 text-xs text-white/70">
              <input type="checkbox" checked={checked} onChange={(e) => onChange({ [key]: e.target.checked })}
                className="rounded border-white/20" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
          Cap: <span className="text-white font-medium">${settings.totalCap}</span> ·
          Range: <span className="text-white">${settings.minSalary}–${settings.maxSalary}</span> ·
          Draft: <span className="text-cyan-300">{settings.draftMode.replace(/_/g, ' ')}</span>
        </div>
      </div>
      {isNfl && <IdpSettingsPanel settings={idpSettings} onChange={onIdpChange} />}
    </div>
  )
}

// ===== IDP SETTINGS PANEL =====

interface IdpSettingsPanelProps {
  settings: WizardIdpSettings
  onChange: (patch: Partial<WizardIdpSettings>) => void
}

const IDP_POS_MODES: { value: WizardIdpSettings['positionMode']; label: string; desc: string }[] = [
  { value: 'standard', label: 'Standard', desc: 'DL, LB, DB (grouped)' },
  { value: 'advanced', label: 'Advanced', desc: 'DE, DT, LB, CB, S (split)' },
  { value: 'hybrid', label: 'Hybrid', desc: 'Both grouped + split' },
]

const IDP_PRESETS: { value: WizardIdpSettings['rosterPreset']; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: '6 starters' },
  { value: 'standard', label: 'Standard', desc: '8 starters' },
  { value: 'advanced', label: 'Advanced', desc: '11 starters' },
  { value: 'custom', label: 'Custom', desc: 'Set your own' },
]

const IDP_SCORING: { value: WizardIdpSettings['scoringPreset']; label: string; desc: string }[] = [
  { value: 'balanced', label: 'Balanced', desc: 'Equal weight' },
  { value: 'tackle_heavy', label: 'Tackle Heavy', desc: 'Rewards LBs' },
  { value: 'big_play_heavy', label: 'Big Play', desc: 'Sacks/INTs/TDs' },
]

export function IdpSettingsPanel({ settings, onChange }: IdpSettingsPanelProps) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
      <div className="text-sm font-semibold text-white/90">IDP Settings (NFL)</div>
      <div className="mt-4">
        <label className="mb-2 block text-xs text-white/50">Position Mode</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {IDP_POS_MODES.map((mode) => (
            <button key={mode.value} type="button" onClick={() => onChange({ positionMode: mode.value })}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${settings.positionMode === mode.value ? 'border-amber-400/50 bg-amber-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
              <div className="font-medium">{mode.label}</div>
              <div className="mt-0.5 text-white/40">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-xs text-white/50">Roster Preset</label>
        <div className="grid gap-2 sm:grid-cols-4">
          {IDP_PRESETS.map((p) => (
            <button key={p.value} type="button" onClick={() => onChange({ rosterPreset: p.value })}
              className={`rounded-xl border px-2 py-2 text-xs transition ${settings.rosterPreset === p.value ? 'border-amber-400/50 bg-amber-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
              <div className="font-medium">{p.label}</div>
              <div className="mt-0.5 text-white/40">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {settings.rosterPreset === 'custom' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">DL</label>
            <Input type="number" min={0} max={4} value={settings.dlSlots}
              onChange={(e) => onChange({ dlSlots: Number(e.target.value) || 2 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">LB</label>
            <Input type="number" min={0} max={5} value={settings.lbSlots}
              onChange={(e) => onChange({ lbSlots: Number(e.target.value) || 2 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">DB</label>
            <Input type="number" min={0} max={4} value={settings.dbSlots}
              onChange={(e) => onChange({ dbSlots: Number(e.target.value) || 2 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">IDP FLEX</label>
            <Input type="number" min={0} max={3} value={settings.idpFlexSlots}
              onChange={(e) => onChange({ idpFlexSlots: Number(e.target.value) || 1 })} />
          </div>
        </div>
      )}
      <div className="mt-4">
        <label className="mb-2 block text-xs text-white/50">Scoring Style</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {IDP_SCORING.map((p) => (
            <button key={p.value} type="button" onClick={() => onChange({ scoringPreset: p.value })}
              className={`rounded-xl border px-3 py-2 text-xs transition ${settings.scoringPreset === p.value ? 'border-amber-400/50 bg-amber-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
              <div className="font-medium">{p.label}</div>
              <div className="mt-0.5 text-white/40">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
        Mode: <span className="text-white">{settings.positionMode}</span> ·
        Preset: <span className="text-white">{settings.rosterPreset}</span> ·
        Scoring: <span className="text-amber-300">{settings.scoringPreset.replace(/_/g, ' ')}</span>
      </div>
    </div>
  )
}
