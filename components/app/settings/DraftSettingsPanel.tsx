'use client'

import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'

type DraftConfig = {
  draft_type?: string
  rounds?: number
  timer_seconds?: number | null
  snake_or_linear?: string
  third_round_reversal?: boolean
  autopick_behavior?: string
  queue_size_limit?: number | null
  pre_draft_ranking_source?: string
  roster_fill_order?: string
  position_filter_behavior?: string
  sport?: string
  variant?: string | null
  leagueSize?: number
}

export default function DraftSettingsPanel({ leagueId }: { leagueId: string }) {
  const { data: config, loading, error } = useLeagueSectionData<DraftConfig>(
    leagueId,
    'draft/config',
  )

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Draft Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view draft settings.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Draft Settings</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error || !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Draft Settings</h3>
        <p className="mt-2 text-xs text-red-400/90">{error ?? 'Failed to load draft config.'}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">Draft Settings</h3>
      <p className="mt-1 text-xs text-white/65">
        Sport-aware defaults from league creation. Commissioner overrides can be applied via league settings.
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/50">Draft type</dt>
          <dd className="text-white/90">{config.draft_type ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Rounds</dt>
          <dd className="text-white/90">{config.rounds ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Timer (seconds)</dt>
          <dd className="text-white/90">{config.timer_seconds ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Order</dt>
          <dd className="text-white/90">{config.snake_or_linear ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Third-round reversal</dt>
          <dd className="text-white/90">{config.third_round_reversal ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Autopick</dt>
          <dd className="text-white/90">{config.autopick_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Queue size limit</dt>
          <dd className="text-white/90">{config.queue_size_limit ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Ranking source</dt>
          <dd className="text-white/90">{config.pre_draft_ranking_source ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Roster fill order</dt>
          <dd className="text-white/90">{config.roster_fill_order ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Position filter</dt>
          <dd className="text-white/90">{config.position_filter_behavior ?? '—'}</dd>
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
