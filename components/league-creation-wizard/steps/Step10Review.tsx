'use client'

import { LEAGUE_TYPE_LABELS, DRAFT_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types'

export type Step10ReviewProps = {
  state: LeagueCreationWizardState
  onCreate: () => void
  onBack: () => void
  creating: boolean
  error: string | null
}

export function Step10Review({ state, onCreate, onBack, creating, error }: Step10ReviewProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Review and create</h2>
      <p className="text-sm text-white/70">Confirm your league settings. You can change most options later in league settings.</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Sport</dt>
          <dd className="text-white/90">{state.sport}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">League type</dt>
          <dd className="text-white/90">{LEAGUE_TYPE_LABELS[state.leagueType]}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Draft type</dt>
          <dd className="text-white/90">{DRAFT_TYPE_LABELS[state.draftType]}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Name</dt>
          <dd className="text-white/90">{state.name || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Teams</dt>
          <dd className="text-white/90">{state.teamCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Scoring</dt>
          <dd className="text-white/90">{state.leagueVariant ?? state.scoringPreset ?? 'Default'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/60">Rounds</dt>
          <dd className="text-white/90">{state.draftSettings.rounds}</dd>
        </div>
      </dl>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={creating}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 min-h-[44px] touch-manipulation disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create league'}
        </button>
      </div>
    </section>
  )
}
