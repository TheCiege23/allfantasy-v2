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

export function DevyDraftSettings({
  settings,
  onChange,
}: {
  settings: WizardDraftSettings
  onChange: (patch: Partial<WizardDraftSettings>) => void
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-[#07122d]/70 p-4">
      <div>
        <p className="text-sm font-medium text-cyan-200">Devy roster settings</p>
        <p className="mt-1 text-xs text-white/55">
          Set the size of the devy stash, taxi depth, IR, and which college sports feed the player pool.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-white/90">Devy slots</Label>
          <Select
            value={String(settings.devySlotCount ?? 12)}
            onValueChange={(value) => onChange({ devySlotCount: Number(value) })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 8, 10, 12, 15, 18, 20].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Devy taxi</Label>
          <Select
            value={String(settings.devyTaxiSlots ?? 6)}
            onValueChange={(value) => onChange({ devyTaxiSlots: Number(value) })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 4, 6, 8, 10, 12].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Devy IR</Label>
          <Select
            value={String(settings.devyIrSlots ?? 2)}
            onValueChange={(value) => onChange({ devyIrSlots: Number(value) })}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-gray-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/90">College sports covered</Label>
        <div className="flex flex-wrap gap-2">
          {COLLEGE_SPORT_OPTIONS.map((sport) => {
            const active = (settings.devyCollegeSports ?? ['NCAAF']).includes(sport)
            return (
              <button
                key={sport}
                type="button"
                onClick={() => onChange({ devyCollegeSports: toggleSport(settings.devyCollegeSports, sport) })}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                  active
                    ? 'border-cyan-300 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/15 bg-black/25 text-white/70'
                }`}
              >
                {sport}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
