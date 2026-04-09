'use client'

import { Input } from '@/components/ui/input'
import type { WizardSurvivorSettings, WizardGuillotineSettings } from '@/lib/league-creation-wizard/types'

// ===== SURVIVOR SETTINGS PANEL =====

interface SurvivorSettingsPanelProps {
  settings: WizardSurvivorSettings
  onChange: (patch: Partial<WizardSurvivorSettings>) => void
  sport: string
}

export function SurvivorSettingsPanel({ settings, onChange, sport }: SurvivorSettingsPanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm font-semibold text-white/90">Survivor Settings</div>

      {/* Commissioner Role */}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onChange({ commissionerPlays: false })}
          className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${!settings.commissionerPlays ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
          <div className="font-medium">Spectator</div>
          <div className="mt-0.5 text-white/40">Manage without playing</div>
        </button>
        <button type="button" onClick={() => onChange({ commissionerPlays: true })}
          className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${settings.commissionerPlays ? 'border-amber-400/50 bg-amber-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
          <div className="font-medium">Participating</div>
          <div className="mt-0.5 text-white/40">Play as manager (blind mode)</div>
        </button>
      </div>

      {/* Tribes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Tribes</label>
          <Input type="number" min={2} max={5} value={settings.tribeCount}
            onChange={(e) => onChange({ tribeCount: Number(e.target.value) || 4 })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Merge at (players remaining)</label>
          <Input type="number" min={4} max={16} value={settings.mergeAtCount}
            onChange={(e) => onChange({ mergeAtCount: Number(e.target.value) || 10 })} />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'idolsEnabled' as const, label: 'Idols', checked: settings.idolsEnabled },
          { key: 'exileEnabled' as const, label: 'Exile Island', checked: settings.exileEnabled },
          { key: 'rocksEnabled' as const, label: 'Go to Rocks', checked: settings.rocksEnabled },
        ].map(({ key, label, checked }) => (
          <label key={key} className="flex items-center gap-1.5 text-xs text-white/70">
            <input type="checkbox" checked={checked} onChange={(e) => onChange({ [key]: e.target.checked })}
              className="rounded border-white/20" />
            {label}
          </label>
        ))}
      </div>

      {settings.idolsEnabled && (
        <div className="w-32">
          <label className="mb-1 block text-xs text-white/50">Idol count</label>
          <Input type="number" min={1} max={20} value={settings.idolCount}
            onChange={(e) => onChange({ idolCount: Number(e.target.value) || 9 })} />
        </div>
      )}
    </div>
  )
}

// ===== GUILLOTINE SETTINGS PANEL =====

interface GuillotineSettingsPanelProps {
  settings: WizardGuillotineSettings
  onChange: (patch: Partial<WizardGuillotineSettings>) => void
  sport: string
}

const SPORT_INFO: Record<string, { weeks: number; chopDay: string; waiverDay: string }> = {
  NFL: { weeks: 18, chopDay: 'Tuesday', waiverDay: 'Wednesday' },
  NBA: { weeks: 24, chopDay: 'Monday', waiverDay: 'Tuesday' },
  MLB: { weeks: 26, chopDay: 'Monday', waiverDay: 'Tuesday' },
  NHL: { weeks: 24, chopDay: 'Monday', waiverDay: 'Tuesday' },
  NCAAF: { weeks: 14, chopDay: 'Sunday', waiverDay: 'Monday' },
  NCAAB: { weeks: 20, chopDay: 'Monday', waiverDay: 'Tuesday' },
  SOCCER: { weeks: 38, chopDay: 'Tuesday', waiverDay: 'Wednesday' },
}

export function GuillotineSettingsPanel({ settings, onChange, sport }: GuillotineSettingsPanelProps) {
  const info = SPORT_INFO[sport.toUpperCase()] ?? SPORT_INFO.NFL!

  return (
    <div className="space-y-5 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
      <div className="text-sm font-semibold text-white/90">Guillotine Settings</div>

      {/* Schedule info */}
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
        <span className="text-white/70">{info.weeks} weeks</span> · Chop: <span className="text-red-300/80">{info.chopDay}</span> · Waivers: <span className="text-emerald-300/80">{info.waiverDay}</span> · Default teams: <span className="text-white font-medium">{info.weeks - 1}</span>
      </div>

      {/* Endgame */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Endgame format</label>
        <div className="grid gap-2 sm:grid-cols-4">
          {(['last_team_standing', 'final_four', 'final_three', 'final_two'] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => onChange({ endgame: mode })}
              className={`rounded-xl border px-2 py-2 text-xs transition ${settings.endgame === mode ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'}`}>
              {mode.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Numbers + toggles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Eliminations per period</label>
          <Input type="number" min={1} max={3} value={settings.eliminationsPerPeriod}
            onChange={(e) => onChange({ eliminationsPerPeriod: Number(e.target.value) || 1 })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">FAAB budget</label>
          <Input type="number" min={0} max={1000} value={settings.faabBudget}
            onChange={(e) => onChange({ faabBudget: Number(e.target.value) || 100 })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={settings.protectedWeek1} onChange={(e) => onChange({ protectedWeek1: e.target.checked })}
            className="rounded border-white/20" />
          No elimination Week 1
        </label>
        <label className="flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={settings.samePeriodPickups} onChange={(e) => onChange({ samePeriodPickups: e.target.checked })}
            className="rounded border-white/20" />
          Same-period pickups
        </label>
        <label className="flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={settings.tradesEnabled} onChange={(e) => onChange({ tradesEnabled: e.target.checked })}
            className="rounded border-white/20" />
          Enable trades
        </label>
      </div>
    </div>
  )
}
