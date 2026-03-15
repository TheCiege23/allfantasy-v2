'use client'

import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'

type ScheduleConfig = {
  schedule_unit?: string
  regular_season_length?: number
  matchup_frequency?: string
  matchup_cadence?: string
  schedule_generation_strategy?: string
  playoff_transition_point?: number | null
  head_to_head_behavior?: string
  lock_time_behavior?: string
  lock_window_behavior?: string
  scoring_period_behavior?: string
  reschedule_handling?: string
  doubleheader_handling?: string
  sport?: string
  variant?: string | null
}

export default function ScheduleSettingsPanel({ leagueId }: { leagueId: string }) {
  const { data: config, loading, error } = useLeagueSectionData<ScheduleConfig>(
    leagueId,
    'schedule/config',
  )

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Schedule Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view schedule settings.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Schedule Settings</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error || !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Schedule Settings</h3>
        <p className="mt-2 text-xs text-red-400/90">{error ?? 'Failed to load schedule config.'}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">Schedule Settings</h3>
      <p className="mt-1 text-xs text-white/65">
        Sport-aware defaults from league creation. Commissioner overrides can be applied via league settings.
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/50">Schedule unit</dt>
          <dd className="text-white/90">{config.schedule_unit ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Regular season length</dt>
          <dd className="text-white/90">{config.regular_season_length ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Matchup frequency</dt>
          <dd className="text-white/90">{config.matchup_frequency ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Matchup cadence</dt>
          <dd className="text-white/90">{config.matchup_cadence ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Generation strategy</dt>
          <dd className="text-white/90">{config.schedule_generation_strategy ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Playoff transition (week)</dt>
          <dd className="text-white/90">{config.playoff_transition_point ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Head-to-head / points</dt>
          <dd className="text-white/90">{config.head_to_head_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Lock time behavior</dt>
          <dd className="text-white/90">{config.lock_time_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Lock window</dt>
          <dd className="text-white/90">{config.lock_window_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Scoring period</dt>
          <dd className="text-white/90">{config.scoring_period_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Reschedule handling</dt>
          <dd className="text-white/90">{config.reschedule_handling ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Doubleheader / multi-game</dt>
          <dd className="text-white/90">{config.doubleheader_handling ?? '—'}</dd>
        </div>
        {config.sport && (
          <div>
            <dt className="text-white/50">Sport / variant</dt>
            <dd className="text-white/90">{config.sport}{config.variant ? ` · ${config.variant}` : ''}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
