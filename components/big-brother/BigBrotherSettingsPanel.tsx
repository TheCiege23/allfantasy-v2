'use client'

/**
 * [NEW] Big Brother commissioner settings panel. PROMPT 2/6.
 * Mobile-first; saves via PATCH /api/leagues/[leagueId]/big-brother/config.
 */

import { useEffect, useState } from 'react'

interface BigBrotherConfig {
  sport: string
  hohChallengeDayOfWeek: number | null
  hohChallengeTimeUtc: string | null
  nominationDeadlineDayOfWeek: number | null
  nominationDeadlineTimeUtc: string | null
  vetoDrawDayOfWeek: number | null
  vetoDrawTimeUtc: string | null
  vetoDecisionDeadlineDayOfWeek: number | null
  vetoDecisionDeadlineTimeUtc: string | null
  replacementNomineeDeadlineDayOfWeek: number | null
  replacementNomineeDeadlineTimeUtc: string | null
  evictionVoteOpenDayOfWeek: number | null
  evictionVoteOpenTimeUtc: string | null
  evictionVoteCloseDayOfWeek: number | null
  evictionVoteCloseTimeUtc: string | null
  finalNomineeCount: number
  vetoCompetitorCount: number
  consecutiveHohAllowed: boolean
  hohVotesOnlyInTie: boolean
  juryStartMode: string
  juryStartAfterEliminations: number | null
  juryStartWhenRemaining: number | null
  juryStartWeek: number | null
  finaleFormat: string
  waiverReleaseTiming: string
  publicVoteTotalsVisibility: string
  challengeMode: string
  antiCollusionLogging: boolean
  inactivePlayerHandling: string
  autoNominationFallback: string
  evictionTieBreakMode?: string
  weekProgressionPaused?: boolean
}

interface Props {
  leagueId: string
  isCommissioner: boolean
  onSaved?: () => void
}

const DAYS = [
  { value: 0, label: '—' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

export function BigBrotherSettingsPanel({ leagueId, isCommissioner, onSaved }: Props) {
  const [config, setConfig] = useState<BigBrotherConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/config`, { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Not a Big Brother league' : 'Failed to load')
          setLoading(false)
          return
        }
        const data = await res.json()
        if (data.config) setConfig(data.config)
      } catch {
        if (active) setError('Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchConfig()
    return () => { active = false }
  }, [leagueId])

  const update = (partial: Partial<BigBrotherConfig>) => {
    if (!config) return
    setConfig({ ...config, ...partial })
  }

  const save = async () => {
    if (!config || !isCommissioner) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/big-brother/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError((err as { error?: string }).error ?? 'Save failed')
        return
      }
      onSaved?.()
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-white/60">Loading Big Brother settings…</div>
  if (error && !config) return <div className="text-sm text-red-300">{error}</div>
  if (!config) return null

  const inputCls = 'mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white disabled:opacity-50'
  const labelCls = 'text-xs text-white/60'

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-white">Big Brother settings</h3>
      {!isCommissioner && (
        <p className="text-xs text-white/50">Only the commissioner can edit these.</p>
      )}

      {/* Schedule: HOH challenge */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">HOH challenge</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Day of week (1–7)</span>
            <select
              value={config.hohChallengeDayOfWeek ?? 0}
              onChange={(e) => update({ hohChallengeDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Time (UTC)</span>
            <input
              type="text"
              placeholder="e.g. 20:00"
              value={config.hohChallengeTimeUtc ?? ''}
              onChange={(e) => update({ hohChallengeTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Nomination deadline */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Nomination deadline</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Day of week</span>
            <select
              value={config.nominationDeadlineDayOfWeek ?? 0}
              onChange={(e) => update({ nominationDeadlineDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Time (UTC)</span>
            <input
              type="text"
              value={config.nominationDeadlineTimeUtc ?? ''}
              onChange={(e) => update({ nominationDeadlineTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Veto draw */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Veto draw</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Day of week</span>
            <select
              value={config.vetoDrawDayOfWeek ?? 0}
              onChange={(e) => update({ vetoDrawDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Time (UTC)</span>
            <input
              type="text"
              value={config.vetoDrawTimeUtc ?? ''}
              onChange={(e) => update({ vetoDrawTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Veto decision & replacement deadlines */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Veto decision & replacement nominee</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Veto decision deadline day</span>
            <select
              value={config.vetoDecisionDeadlineDayOfWeek ?? 0}
              onChange={(e) => update({ vetoDecisionDeadlineDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Veto decision time (UTC)</span>
            <input
              type="text"
              value={config.vetoDecisionDeadlineTimeUtc ?? ''}
              onChange={(e) => update({ vetoDecisionDeadlineTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Replacement nominee deadline day</span>
            <select
              value={config.replacementNomineeDeadlineDayOfWeek ?? 0}
              onChange={(e) => update({ replacementNomineeDeadlineDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Replacement nominee time (UTC)</span>
            <input
              type="text"
              value={config.replacementNomineeDeadlineTimeUtc ?? ''}
              onChange={(e) => update({ replacementNomineeDeadlineTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Eviction vote window */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Eviction vote window</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Vote open day</span>
            <select
              value={config.evictionVoteOpenDayOfWeek ?? 0}
              onChange={(e) => update({ evictionVoteOpenDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Vote open time (UTC)</span>
            <input
              type="text"
              value={config.evictionVoteOpenTimeUtc ?? ''}
              onChange={(e) => update({ evictionVoteOpenTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vote close day</span>
            <select
              value={config.evictionVoteCloseDayOfWeek ?? 0}
              onChange={(e) => update({ evictionVoteCloseDayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!isCommissioner}
              className={inputCls}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Vote close time (UTC)</span>
            <input
              type="text"
              value={config.evictionVoteCloseTimeUtc ?? ''}
              onChange={(e) => update({ evictionVoteCloseTimeUtc: e.target.value || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Veto & noms counts */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Veto competitor count (default 6)</span>
          <input
            type="number"
            min={3}
            max={12}
            value={config.vetoCompetitorCount}
            onChange={(e) => update({ vetoCompetitorCount: Math.max(3, Math.min(12, parseInt(e.target.value, 10) || 6)) })}
            disabled={!isCommissioner}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Final nominee count (fixed 2)</span>
          <input
            type="number"
            min={2}
            max={2}
            value={config.finalNomineeCount}
            disabled
            className={inputCls}
          />
        </label>
      </div>

      {/* HOH options */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">HOH options</h4>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.consecutiveHohAllowed}
            onChange={(e) => update({ consecutiveHohAllowed: e.target.checked })}
            disabled={!isCommissioner}
            className="rounded border-white/20"
          />
          <span className="text-sm text-white/80">Allow consecutive HOH wins</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.hohVotesOnlyInTie}
            onChange={(e) => update({ hohVotesOnlyInTie: e.target.checked })}
            disabled={!isCommissioner}
            className="rounded border-white/20"
          />
          <span className="text-sm text-white/80">HOH votes only in tie</span>
        </label>
      </div>

      {/* Jury & finale */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Jury & finale</h4>
        <label className="block">
          <span className={labelCls}>Jury start</span>
          <select
            value={config.juryStartMode}
            onChange={(e) => update({ juryStartMode: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="after_eliminations">After X eliminations</option>
            <option value="when_remaining">When X players remain</option>
            <option value="fixed_week">Fixed week</option>
          </select>
        </label>
        {config.juryStartMode === 'after_eliminations' && (
          <label className="block">
            <span className={labelCls}>Jury after this many eliminations</span>
            <input
              type="number"
              min={1}
              value={config.juryStartAfterEliminations ?? 7}
              onChange={(e) => update({ juryStartAfterEliminations: parseInt(e.target.value, 10) || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        )}
        {config.juryStartMode === 'when_remaining' && (
          <label className="block">
            <span className={labelCls}>Jury when this many remain</span>
            <input
              type="number"
              min={2}
              value={config.juryStartWhenRemaining ?? 7}
              onChange={(e) => update({ juryStartWhenRemaining: parseInt(e.target.value, 10) || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        )}
        {config.juryStartMode === 'fixed_week' && (
          <label className="block">
            <span className={labelCls}>Jury start week</span>
            <input
              type="number"
              min={1}
              value={config.juryStartWeek ?? 1}
              onChange={(e) => update({ juryStartWeek: parseInt(e.target.value, 10) || null })}
              disabled={!isCommissioner}
              className={inputCls}
            />
          </label>
        )}
        <label className="block">
          <span className={labelCls}>Finale format</span>
          <select
            value={config.finaleFormat}
            onChange={(e) => update({ finaleFormat: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="final_2">Final 2</option>
            <option value="final_3">Final 3</option>
          </select>
        </label>
      </div>

      {/* Waiver & visibility */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Waiver & vote visibility</h4>
        <label className="block">
          <span className={labelCls}>Waiver release after eviction</span>
          <select
            value={config.waiverReleaseTiming}
            onChange={(e) => update({ waiverReleaseTiming: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="immediate">Immediate</option>
            <option value="next_waiver_run">Next waiver run</option>
            <option value="faab_window">FAAB window</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Public vote totals</span>
          <select
            value={config.publicVoteTotalsVisibility}
            onChange={(e) => update({ publicVoteTotalsVisibility: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="exact">Show exact totals</option>
            <option value="evicted_only">Show only evicted player total</option>
          </select>
        </label>
      </div>

      {/* Challenge & safety */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/90">Challenge & safety</h4>
        <label className="block">
          <span className={labelCls}>Challenge mode</span>
          <select
            value={config.challengeMode}
            onChange={(e) => update({ challengeMode: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="ai_theme">AI-generated theme prompts</option>
            <option value="deterministic_score">Deterministic score-based</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.antiCollusionLogging}
            onChange={(e) => update({ antiCollusionLogging: e.target.checked })}
            disabled={!isCommissioner}
            className="rounded border-white/20"
          />
          <span className="text-sm text-white/80">Anti-collusion logging</span>
        </label>
        <label className="block">
          <span className={labelCls}>Inactive player handling</span>
          <select
            value={config.inactivePlayerHandling}
            onChange={(e) => update({ inactivePlayerHandling: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="none">None</option>
            <option value="replacement_after_n_weeks">Replacement after N weeks</option>
            <option value="commissioner_only">Commissioner only</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Auto-nomination if HOH times out</span>
          <select
            value={config.autoNominationFallback}
            onChange={(e) => update({ autoNominationFallback: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="lowest_season_points">Lowest season points</option>
            <option value="random">Random</option>
            <option value="commissioner">Commissioner</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Eviction tie-break (when vote is tied)</span>
          <select
            value={config.evictionTieBreakMode ?? 'season_points'}
            onChange={(e) => update({ evictionTieBreakMode: e.target.value })}
            disabled={!isCommissioner}
            className={inputCls}
          >
            <option value="hoh_vote">HOH vote breaks tie</option>
            <option value="season_points">Lowest season points evicted</option>
            <option value="random">Random (seeded)</option>
            <option value="commissioner">Commissioner decides</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.weekProgressionPaused ?? false}
            onChange={(e) => update({ weekProgressionPaused: e.target.checked })}
            disabled={!isCommissioner}
            className="rounded border-white/20"
          />
          <span className="text-sm text-white/80">Pause week progression (automation will not advance)</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {isCommissioner && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      )}
    </div>
  )
}
