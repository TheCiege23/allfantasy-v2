'use client'

import { useLeagueSectionData } from '@/hooks/useLeagueSectionData'

type PlayoffConfig = {
  playoff_team_count?: number
  playoff_weeks?: number
  playoff_start_week?: number | null
  first_round_byes?: number
  bracket_type?: string
  matchup_length?: number
  total_rounds?: number | null
  consolation_bracket_enabled?: boolean
  third_place_game_enabled?: boolean
  toilet_bowl_enabled?: boolean
  championship_length?: number
  consolation_plays_for?: string
  seeding_rules?: string
  tiebreaker_rules?: string[]
  bye_rules?: string | null
  reseed_behavior?: string
  standings_tiebreakers?: string[]
  sport?: string
  variant?: string | null
}

export default function PlayoffSettingsPanel({ leagueId }: { leagueId: string }) {
  const { data: config, loading, error } = useLeagueSectionData<PlayoffConfig>(
    leagueId,
    'playoff/config',
  )

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Playoff Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view playoff settings.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Playoff Settings</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error || !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Playoff Settings</h3>
        <p className="mt-2 text-xs text-red-400/90">{error ?? 'Failed to load playoff config.'}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">Playoff Settings</h3>
      <p className="mt-1 text-xs text-white/65">
        Sport-aware defaults from league creation. Commissioner overrides can be applied via league settings.
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/50">Playoff teams</dt>
          <dd className="text-white/90">{config.playoff_team_count ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Playoff start (week)</dt>
          <dd className="text-white/90">{config.playoff_start_week ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Playoff weeks</dt>
          <dd className="text-white/90">{config.playoff_weeks ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">First-round byes</dt>
          <dd className="text-white/90">{config.first_round_byes ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Bracket type</dt>
          <dd className="text-white/90">{config.bracket_type ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Matchup length</dt>
          <dd className="text-white/90">{config.matchup_length ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Total rounds</dt>
          <dd className="text-white/90">{config.total_rounds ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Championship length</dt>
          <dd className="text-white/90">{config.championship_length ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Consolation bracket</dt>
          <dd className="text-white/90">{config.consolation_bracket_enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Consolation plays for</dt>
          <dd className="text-white/90">{config.consolation_plays_for ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Third-place game</dt>
          <dd className="text-white/90">{config.third_place_game_enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Toilet bowl</dt>
          <dd className="text-white/90">{config.toilet_bowl_enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Seeding rules</dt>
          <dd className="text-white/90">{config.seeding_rules ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-white/50">Reseed behavior</dt>
          <dd className="text-white/90">{config.reseed_behavior ?? '—'}</dd>
        </div>
        {Array.isArray(config.tiebreaker_rules) && config.tiebreaker_rules.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-white/50">Playoff tiebreakers</dt>
            <dd className="text-white/90">{config.tiebreaker_rules.join(' → ')}</dd>
          </div>
        )}
        {config.bye_rules && (
          <div>
            <dt className="text-white/50">Bye rules</dt>
            <dd className="text-white/90">{config.bye_rules}</dd>
          </div>
        )}
        {Array.isArray(config.standings_tiebreakers) && config.standings_tiebreakers.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-white/50">Standings tiebreakers</dt>
            <dd className="text-white/90">{config.standings_tiebreakers.join(' → ')}</dd>
          </div>
        )}
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
