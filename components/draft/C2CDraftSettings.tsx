'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WizardDraftSettings } from '@/lib/league-creation-wizard/types'

const COLLEGE_SPORT_OPTIONS = ['NCAAF', 'NCAAB'] as const

function toggleSport(current: string[] | undefined, sport: string) {
  const next = new Set((current ?? []).map((entry) => entry.toUpperCase()))
  if (next.has(sport)) {
    next.delete(sport)
  } else {
    next.add(sport)
  }
  return Array.from(next)
}

export function C2CDraftSettings({
  settings,
  onChange,
}: {
  settings: WizardDraftSettings
  onChange: (patch: Partial<WizardDraftSettings>) => void
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-violet-400/20 bg-[#0d1125]/80 p-4">
      <div>
        <p className="text-sm font-medium text-violet-200">C2C configuration</p>
        <p className="mt-1 text-xs text-white/55">
          Control college roster size, scoring, and whether pro players stay in the shared draft pool.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-white/90">College sports covered</Label>
        <div className="flex flex-wrap gap-2">
          {COLLEGE_SPORT_OPTIONS.map((sport) => {
            const active = (settings.c2cCollegeSports ?? ['NCAAF']).includes(sport)
            return (
              <button
                key={sport}
                type="button"
                onClick={() => onChange({ c2cCollegeSports: toggleSport(settings.c2cCollegeSports, sport) })}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                  active
                    ? 'border-violet-300 bg-violet-400/10 text-violet-100'
                    : 'border-white/15 bg-black/25 text-white/70'
                }`}
              >
                {sport}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-white/90">Startup mode</Label>
          <Select
            value={settings.c2cStartupMode ?? 'merged'}
            onValueChange={(value: 'merged' | 'separate') => onChange({ c2cStartupMode: value })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merged">Merged startup</SelectItem>
              <SelectItem value="separate">Separate pro + college startup</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Scoring system</Label>
          <Select
            value={settings.c2cScoringSystem ?? 'ppr'}
            onValueChange={(value: 'ppr' | 'standard' | 'points') => onChange({ c2cScoringSystem: value })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ppr">PPR</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="points">Points</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">College roster size</Label>
          <Select
            value={String(settings.c2cCollegeRosterSize ?? 20)}
            onValueChange={(value) => onChange({ c2cCollegeRosterSize: Number(value) })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 18, 20, 24, 28, 30].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Standings model</Label>
          <Select
            value={settings.c2cStandingsModel ?? 'unified'}
            onValueChange={(value: 'unified' | 'separate' | 'hybrid') => onChange({ c2cStandingsModel: value })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unified">Unified</SelectItem>
              <SelectItem value="separate">Separate</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={settings.c2cMixProPlayers ?? true}
            onChange={(event) => onChange({ c2cMixProPlayers: event.target.checked })}
            className="rounded border-white/20"
          />
          Mix pro players in shared pool
        </label>

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={settings.c2cBestBallCollege ?? false}
            onChange={(event) => onChange({ c2cBestBallCollege: event.target.checked })}
            className="rounded border-white/20"
          />
          Best ball college side
        </label>
      </div>
    </div>
  )
}
