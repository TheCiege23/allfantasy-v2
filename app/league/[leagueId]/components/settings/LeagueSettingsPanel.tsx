'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'

export function LeagueSettingsPanel({
  leagueId: _leagueId,
  initialData,
  hasAfCommissionerSub,
  canEdit,
  save,
  debouncedSave,
}: {
  leagueId: string
  initialData: CommissionerSettingsFormData
  hasAfCommissionerSub: boolean
  canEdit: boolean
  save: (partial: Record<string, unknown>) => Promise<void>
  debouncedSave: (partial: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(initialData.name ?? '')
  const [timezone, setTimezone] = useState(initialData.timezone ?? 'America/New_York')
  const [playoffTeams, setPlayoffTeams] = useState(initialData.playoffTeams ?? 4)
  const [medianGame, setMedianGame] = useState(Boolean(initialData.medianGame))

  useEffect(() => {
    setName(initialData.name ?? '')
    setTimezone(initialData.timezone ?? 'America/New_York')
    setPlayoffTeams(initialData.playoffTeams ?? 4)
    setMedianGame(Boolean(initialData.medianGame))
  }, [initialData])

  const disabled = !canEdit
  const subHint = !hasAfCommissionerSub

  return (
    <div className="space-y-6 px-6 py-6 text-[13px] text-white/85">
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-name">
          League name
        </label>
        <input
          id="ls-name"
          className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={name}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            setName(v)
            debouncedSave({ name: v })
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-tz">
          Timezone
        </label>
        <input
          id="ls-tz"
          className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={timezone}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            setTimezone(v)
            debouncedSave({ timezone: v })
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-pt">
          Playoff teams
        </label>
        <input
          id="ls-pt"
          type="number"
          min={2}
          max={16}
          className="w-32 rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={playoffTeams}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value)
            setPlayoffTeams(n)
            debouncedSave({ playoffTeams: n })
          }}
        />
        {subHint ? (
          <p className="mt-1 text-[11px] text-amber-400/90">
            7- and 9-team brackets require an AF Commissioner subscription (server-enforced).
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-white/80">
        <input
          type="checkbox"
          className="rounded border-white/20 bg-[#0a1220]"
          checked={medianGame}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.checked
            setMedianGame(v)
            void save({ medianGame: v })
          }}
        />
        Median game (vs league median)
      </label>
    </div>
  )
}
