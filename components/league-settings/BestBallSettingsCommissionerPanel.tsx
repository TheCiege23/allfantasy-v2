'use client'

/**
 * BestBallSettingsCommissionerPanel
 * In-league commissioner panel for editing Best Ball mode settings.
 * Calls PATCH /api/bestball/settings and surfaces all fields normalized
 * by normalizeBestBallSettings: mode, contest structure, scoring model,
 * waivers/trades/subs, tiebreaker, and scoring period.
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getBestBallSportProfile,
  BEST_BALL_CONTEST_STRUCTURES,
  BEST_BALL_MATCHUP_FORMATS,
  BEST_BALL_PLAYOFF_FORMATS,
} from '@/lib/bestball/rules'
import type { BestBallCreateSettings, BestBallModeId } from '@/lib/bestball/rules'

interface Props {
  leagueId: string
  sport: string
  canEdit: boolean
}

type LoadedSettings = Pick<
  BestBallCreateSettings,
  | 'mode'
  | 'contestStructure'
  | 'matchupFormat'
  | 'playoffFormat'
  | 'tieRule'
  | 'scoringPeriod'
  | 'waiversEnabled'
  | 'tradesEnabled'
  | 'substitutionsEnabled'
  | 'podSize'
  | 'tournamentAdvancementRounds'
  | 'regularSeasonLength'
  | 'playoffTeams'
>

type ApiResponse = {
  league: {
    bbWaiversEnabled: boolean
    bbTradesEnabled: boolean
    bbMatchupFormat: string
    bbScoringPeriod: string
    bbTiebreaker: string
    bestBallVariant: string
    settings: Record<string, unknown>
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[12px] text-white/55">{label}</span>
      <div className="sm:w-56">{children}</div>
    </div>
  )
}

function SelectField({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-white/15 bg-[#0a1228] px-3 py-2 text-[12px] text-white disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-cyan-500' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'left-5' : 'left-1'}`}
      />
    </button>
  )
}

function IntField({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  disabled: boolean
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const parsed = Number.parseInt(e.target.value || '0', 10)
        if (Number.isFinite(parsed)) onChange(Math.max(min, Math.min(max, parsed)))
      }}
      disabled={disabled}
      className="w-full rounded-lg border border-white/15 bg-[#0a1228] px-3 py-2 text-[12px] text-white disabled:opacity-50"
    />
  )
}

export function BestBallSettingsCommissionerPanel({ leagueId, sport, canEdit }: Props) {
  const profile = getBestBallSportProfile(sport)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [settings, setSettings] = useState<LoadedSettings>({
    mode: 'standard',
    contestStructure: 'season_long',
    matchupFormat: profile.defaultMatchupFormat,
    playoffFormat: profile.defaultPlayoffFormat,
    tieRule: 'max_week',
    scoringPeriod: profile.scoringPeriod,
    waiversEnabled: false,
    tradesEnabled: false,
    substitutionsEnabled: false,
    podSize: 12,
    tournamentAdvancementRounds: 0,
    regularSeasonLength: profile.defaultRegularSeasonLength,
    playoffTeams: profile.defaultPlayoffTeams,
  })

  // Load current settings from the bestball API response endpoint
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/bestball?week=1`, {
          cache: 'no-store',
        })
        const json = (await res.json()) as { league?: { settings?: Record<string, unknown> }; error?: string }
        if (!res.ok) throw new Error(json.error ?? 'Failed to load Best Ball settings')
        if (!cancelled && json.league?.settings) {
          const raw = json.league.settings as Record<string, unknown>
          setSettings((prev) => ({
            ...prev,
            mode: (raw.mode as BestBallModeId) ?? prev.mode,
            contestStructure:
              BEST_BALL_CONTEST_STRUCTURES.includes(raw.contestStructure as never)
                ? (raw.contestStructure as LoadedSettings['contestStructure'])
                : prev.contestStructure,
            matchupFormat:
              BEST_BALL_MATCHUP_FORMATS.includes(raw.matchupFormat as never)
                ? (raw.matchupFormat as LoadedSettings['matchupFormat'])
                : prev.matchupFormat,
            playoffFormat:
              BEST_BALL_PLAYOFF_FORMATS.includes(raw.playoffFormat as never)
                ? (raw.playoffFormat as LoadedSettings['playoffFormat'])
                : prev.playoffFormat,
            tieRule: (['points_for', 'max_week', 'advance_all'] as const).includes(raw.tieRule as never)
              ? (raw.tieRule as LoadedSettings['tieRule'])
              : prev.tieRule,
            scoringPeriod: raw.scoringPeriod === 'daily' ? 'daily' : 'weekly',
            waiversEnabled: typeof raw.waiversEnabled === 'boolean' ? raw.waiversEnabled : prev.waiversEnabled,
            tradesEnabled: typeof raw.tradesEnabled === 'boolean' ? raw.tradesEnabled : prev.tradesEnabled,
            substitutionsEnabled:
              typeof raw.substitutionsEnabled === 'boolean' ? raw.substitutionsEnabled : prev.substitutionsEnabled,
            podSize: typeof raw.podSize === 'number' ? raw.podSize : prev.podSize,
            tournamentAdvancementRounds:
              typeof raw.tournamentAdvancementRounds === 'number'
                ? raw.tournamentAdvancementRounds
                : prev.tournamentAdvancementRounds,
            regularSeasonLength:
              typeof raw.regularSeasonLength === 'number' ? raw.regularSeasonLength : prev.regularSeasonLength,
            playoffTeams: typeof raw.playoffTeams === 'number' ? raw.playoffTeams : prev.playoffTeams,
          }))
        }
      } catch (err) {
        if (!cancelled)
          setFetchError(err instanceof Error ? err.message : 'Failed to load Best Ball settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  const save = useCallback(async () => {
    if (!canEdit || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/bestball/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          bbWaiversEnabled: settings.waiversEnabled,
          bbTradesEnabled: settings.tradesEnabled,
          bestBall: {
            mode: settings.mode,
            contestStructure: settings.contestStructure,
            matchupFormat: settings.matchupFormat,
            playoffFormat: settings.playoffFormat,
            tieRule: settings.tieRule,
            scoringPeriod: settings.scoringPeriod,
            substitutionsEnabled: settings.substitutionsEnabled,
            podSize: settings.podSize,
            tournamentAdvancementRounds: settings.tournamentAdvancementRounds,
            regularSeasonLength: settings.regularSeasonLength,
            playoffTeams: settings.playoffTeams,
          } satisfies Partial<BestBallCreateSettings>,
        }),
      })
      const json = (await res.json()) as ApiResponse | { error?: string }
      if (!res.ok) {
        const msg = (json as { error?: string }).error ?? 'Failed to save Best Ball settings'
        toast.error(msg)
      } else {
        toast.success('Best Ball settings saved')
      }
    } catch {
      toast.error('Failed to save Best Ball settings')
    } finally {
      setSaving(false)
    }
  }, [canEdit, leagueId, saving, settings])

  const patch = useCallback((p: Partial<LoadedSettings>) => setSettings((s) => ({ ...s, ...p })), [])

  const isUnderdog = settings.mode === 'underdog'
  const isTournament = settings.contestStructure === 'tournament'
  const isSitAndGo = settings.contestStructure === 'sit_and_go'

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1228]/60 p-4 text-[12px] text-white/50">
        Loading Best Ball settings…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-[12px] text-rose-200">
        {fetchError}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1228]/80 p-4">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-cyan-200/80">Operating Mode</h4>
        <Row label="Mode">
          <SelectField
            value={settings.mode}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'underdog', label: 'Underdog-style' },
            ]}
            onChange={(v) =>
              patch({
                mode: v as BestBallModeId,
                ...(v === 'underdog'
                  ? { waiversEnabled: false, tradesEnabled: false, substitutionsEnabled: false }
                  : {}),
              })
            }
            disabled={!canEdit}
          />
        </Row>
        {isUnderdog ? (
          <p className="mt-2 text-[11px] text-amber-300/80">
            Underdog-style forces waivers, trades, and manual substitutions off.
          </p>
        ) : null}
      </div>

      {/* Contest & Scoring */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1228]/80 p-4">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-cyan-200/80">Contest &amp; Scoring</h4>
        <div className="space-y-4">
          <Row label="Contest structure">
            <SelectField
              value={settings.contestStructure}
              options={[
                { value: 'season_long', label: 'Season-long' },
                { value: 'sit_and_go', label: 'Sit-and-go / pod' },
                { value: 'tournament', label: 'Tournament / advancement' },
              ]}
              onChange={(v) => patch({ contestStructure: v as LoadedSettings['contestStructure'] })}
              disabled={!canEdit}
            />
          </Row>
          <Row label="Scoring model">
            <SelectField
              value={settings.matchupFormat}
              options={[
                { value: 'cumulative', label: 'Cumulative points' },
                { value: 'h2h', label: 'Head-to-head' },
              ]}
              onChange={(v) => patch({ matchupFormat: v as LoadedSettings['matchupFormat'] })}
              disabled={!canEdit}
            />
          </Row>
          <Row label="Playoff format">
            <SelectField
              value={settings.playoffFormat}
              options={[
                { value: 'bracket', label: 'Bracket' },
                { value: 'advancement', label: 'Advancement' },
                { value: 'none', label: 'No playoffs' },
              ]}
              onChange={(v) => patch({ playoffFormat: v as LoadedSettings['playoffFormat'] })}
              disabled={!canEdit}
            />
          </Row>
          <Row label="Scoring period">
            <SelectField
              value={settings.scoringPeriod}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'daily', label: 'Daily' },
              ]}
              onChange={(v) => patch({ scoringPeriod: v as LoadedSettings['scoringPeriod'] })}
              disabled={!canEdit}
            />
          </Row>
          <Row label="Tiebreaker">
            <SelectField
              value={settings.tieRule}
              options={[
                { value: 'points_for', label: 'Total points scored' },
                { value: 'max_week', label: 'Best single-week score' },
                { value: 'advance_all', label: 'Advance all tied teams' },
              ]}
              onChange={(v) => patch({ tieRule: v as LoadedSettings['tieRule'] })}
              disabled={!canEdit}
            />
          </Row>
        </div>
      </div>

      {/* Season structure */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1228]/80 p-4">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-cyan-200/80">Season Structure</h4>
        <div className="space-y-4">
          <Row label="Regular season length">
            <IntField
              value={settings.regularSeasonLength}
              onChange={(v) => patch({ regularSeasonLength: v })}
              min={1}
              max={60}
              disabled={!canEdit}
            />
          </Row>
          <Row label="Playoff teams">
            <IntField
              value={settings.playoffTeams}
              onChange={(v) => patch({ playoffTeams: v })}
              min={0}
              max={16}
              disabled={!canEdit}
            />
          </Row>
          {isTournament ? (
            <Row label="Advancement rounds">
              <IntField
                value={settings.tournamentAdvancementRounds}
                onChange={(v) => patch({ tournamentAdvancementRounds: v })}
                min={0}
                max={10}
                disabled={!canEdit}
              />
            </Row>
          ) : null}
          {isSitAndGo ? (
            <Row label="Pod size">
              <IntField
                value={settings.podSize}
                onChange={(v) => patch({ podSize: v })}
                min={2}
                max={64}
                disabled={!canEdit}
              />
            </Row>
          ) : null}
        </div>
      </div>

      {/* In-season restrictions */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1228]/80 p-4">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-cyan-200/80">In-Season Restrictions</h4>
        <div className="space-y-4">
          <Row label="Waivers">
            <Toggle
              checked={settings.waiversEnabled}
              onChange={(v) => patch({ waiversEnabled: isUnderdog ? false : v })}
              label="Waivers"
              disabled={!canEdit || isUnderdog}
            />
          </Row>
          <Row label="Trades">
            <Toggle
              checked={settings.tradesEnabled}
              onChange={(v) => patch({ tradesEnabled: isUnderdog ? false : v })}
              label="Trades"
              disabled={!canEdit || isUnderdog}
            />
          </Row>
          <Row label="Manual substitutions">
            <Toggle
              checked={settings.substitutionsEnabled}
              onChange={(v) => patch({ substitutionsEnabled: isUnderdog ? false : v })}
              label="Manual substitutions"
              disabled={!canEdit || isUnderdog}
            />
          </Row>
        </div>
        {isUnderdog ? (
          <p className="mt-3 text-[11px] text-white/40">
            Underdog-style locks waivers, trades, and manual subs off. Switch to Standard to enable them.
          </p>
        ) : null}
      </div>

      {/* Sport profile summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1228]/40 p-4">
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/40">
          {profile.label} Sport Profile
        </h4>
        <p className="text-[12px] text-white/60">
          {profile.lineupSlots.reduce((sum, s) => sum + s.count, 0)} starter slots ·{' '}
          {profile.recommendedRosterSize} recommended roster spots · {profile.scoringPeriod} scoring
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-white/40">
          {profile.notes.map((note) => (
            <li key={note}>— {note}</li>
          ))}
        </ul>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Best Ball settings'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
