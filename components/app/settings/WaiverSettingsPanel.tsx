'use client'

import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'

type WaiverConfig = {
  waiver_type?: string
  processing_days?: number[]
  processing_time_utc?: string | null
  claim_limit_per_period?: number | null
  game_lock_behavior?: string | null
  free_agent_unlock_behavior?: string
  continuous_waivers?: boolean
  faab_enabled?: boolean
  faab_budget?: number | null
  faab_reset_rules?: string | null
  sport?: string
  variant?: string | null
  tiebreak_rule?: string | null
  instant_fa_after_clear?: boolean
}

export default function WaiverSettingsPanel({ leagueId }: { leagueId: string }) {
  const { data: config, loading, error } = useLeagueSectionData<WaiverConfig>(
    leagueId,
    'waiver/config',
  )

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Waiver Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view waiver settings.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Waiver Settings</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error || !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Waiver Settings</h3>
        <p className="mt-2 text-xs text-red-400/90">{error ?? 'Failed to load waiver config.'}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">Waiver Settings</h3>
      <p className="mt-1 text-xs text-white/65">
        Sport-aware defaults from league creation. Commissioner overrides can be applied via Commissioner tab or Waivers tab.
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/50">Waiver type</dt>
          <dd className="text-white/90">{config.waiver_type ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Processing days</dt>
          <dd className="text-white/90">
            {Array.isArray(config.processing_days) && config.processing_days.length > 0
              ? config.processing_days.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d] ?? d).join(', ')
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">Processing time (UTC)</dt>
          <dd className="text-white/90">{config.processing_time_utc ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Claim limit per period</dt>
          <dd className="text-white/90">{config.claim_limit_per_period ?? 'Unlimited'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Game lock</dt>
          <dd className="text-white/90">{config.game_lock_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Free agent unlock</dt>
          <dd className="text-white/90">{config.free_agent_unlock_behavior ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Continuous waivers</dt>
          <dd className="text-white/90">{config.continuous_waivers ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-white/50">FAAB enabled</dt>
          <dd className="text-white/90">{config.faab_enabled ? 'Yes' : 'No'}</dd>
        </div>
        {config.faab_enabled && (
          <div>
            <dt className="text-white/50">FAAB budget</dt>
            <dd className="text-white/90">{config.faab_budget ?? '—'}</dd>
          </div>
        )}
        {config.faab_reset_rules && (
          <div>
            <dt className="text-white/50">FAAB reset</dt>
            <dd className="text-white/90">{config.faab_reset_rules}</dd>
          </div>
        )}
        {config.tiebreak_rule && (
          <div>
            <dt className="text-white/50">Tiebreaker</dt>
            <dd className="text-white/90">{config.tiebreak_rule}</dd>
          </div>
        )}
        <div>
          <dt className="text-white/50">Instant FA after clear</dt>
          <dd className="text-white/90">{config.instant_fa_after_clear ? 'Yes' : 'No'}</dd>
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
