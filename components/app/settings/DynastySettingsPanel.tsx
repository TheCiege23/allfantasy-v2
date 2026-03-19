'use client'

import { useCallback, useEffect, useState } from 'react'

type Effective = {
  leagueSize: number | null
  rosterFormatType: string
  scoringFormatType: string
  playoffTeamCount: number
  regularSeasonWeeks: number
  rookiePickOrderMethod: string
  useMaxPfForNonPlayoff: boolean
  rookieDraftRounds: number
  rookieDraftType: string
  divisionsEnabled: boolean
  tradeDeadlineWeek: number | null
  waiverTypeRecommended: string
  futurePicksYearsOut: number
  rosterSummary: { slotName: string; count: number }[]
  scoringPresetName: string
  taxiSlots?: number
  taxiEligibilityYears?: number
  taxiLockBehavior?: string
  taxiInSeasonMoves?: boolean
  taxiPostseasonMoves?: boolean
  taxiScoringOn?: boolean
  taxiDeadlineWeek?: number | null
  taxiPromotionDeadlineWeek?: number | null
}

type Presets = {
  roster: { id: string; label: string; formatType: string }[]
  scoring: { id: string; label: string; formatType: string; summary: string }[]
  playoff: { playoffTeamCount: number; label: string; firstRoundByes: number; playoffStartWeek: number }[]
}

type DynastySettingsResponse = {
  effective?: Effective
  presets?: Presets
  constants?: {
    supportedTeamSizes: number[]
    rookiePickOrderMethods: { value: string; label: string }[]
    vetoRecommendationCopy: string
    taxiEligibilityYearsOptions?: { value: number; label: string }[]
    taxiLockBehaviorOptions?: { value: string; label: string }[]
  }
  draftOrderAuditLog?: { id: string; season: number; userId: string; reason: string | null; createdAt: string }[]
  isDynasty?: boolean
}

export default function DynastySettingsPanel({
  leagueId,
  isCommissioner,
}: {
  leagueId: string
  isCommissioner?: boolean
}) {
  const [data, setData] = useState<DynastySettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [patch, setPatch] = useState<Record<string, unknown>>({})

  const load = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/dynasty-settings`, { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? 'Failed to load dynasty settings')
        setData(null)
      } else {
        setData(json)
      }
    } catch {
      setError('Failed to load dynasty settings')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
    if (!leagueId || !isCommissioner || Object.keys(patch).length === 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/dynasty-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        setPatch({})
        await load()
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json?.error ?? 'Save failed')
      }
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }, [leagueId, isCommissioner, patch, load])

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Dynasty Settings</h3>
        <p className="mt-2 text-xs text-white/65">Loading…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Dynasty Settings</h3>
        <p className="mt-2 text-xs text-red-400/90">{error}</p>
      </section>
    )
  }

  if (!data?.isDynasty) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Dynasty Settings</h3>
        <p className="mt-2 text-xs text-white/65">This league is not a dynasty league. Roster, scoring, and playoff settings apply to all leagues; dynasty-specific options (rookie draft order, anti-tank, trade deadline) appear here for dynasty, Devy, and C2C leagues.</p>
      </section>
    )
  }

  const effective = data.effective
  const presets = data.presets
  const constants = data.constants

  if (data.isDynasty && !effective) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Dynasty Settings</h3>
        <p className="mt-2 text-xs text-white/65">Unable to load roster and scoring details. Try refreshing the page.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">Dynasty Settings</h3>
      <p className="text-xs text-white/65">
        Shared base for standard Dynasty, Devy, and C2C. Roster, scoring, and playoff presets; rookie draft order and waiver/trade defaults.
      </p>

      {/* Roster summary */}
      {effective && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Roster</h4>
          <p className="mt-1 text-xs text-white/65">
            Format: <span className="text-white/90">{effective.rosterFormatType}</span>
            {effective.rosterSummary?.length > 0 && (
              <> · {effective.rosterSummary.map((s) => `${s.slotName} ${s.count}`).join(', ')}</>
            )}
          </p>
          {presets?.roster?.length && isCommissioner && (
            <select
              className="mt-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
              value={effective.rosterFormatType}
              onChange={(e) => {
                setPatch((p) => ({ ...p, roster_format_type: e.target.value }))
              }}
            >
              {presets.roster.map((r) => (
                <option key={r.id} value={r.formatType}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Scoring summary */}
      {effective && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Scoring</h4>
          <p className="mt-1 text-xs text-white/65">
            {effective.scoringPresetName} ({effective.scoringFormatType})
          </p>
          {presets?.scoring?.length && isCommissioner && (
            <select
              className="mt-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
              value={effective.scoringFormatType}
              onChange={(e) => {
                setPatch((p) => ({ ...p, scoring_format_type: e.target.value }))
              }}
            >
              {presets.scoring.map((s) => (
                <option key={s.id} value={s.formatType}>{s.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Playoff */}
      {effective && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Playoffs</h4>
          <p className="mt-1 text-xs text-white/65">
            {effective.playoffTeamCount} teams · Start week from structure · Regular season {effective.regularSeasonWeeks} weeks
          </p>
          {presets?.playoff?.length && isCommissioner && (
            <select
              className="mt-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
              value={effective.playoffTeamCount}
              onChange={(e) => {
                setPatch((p) => ({ ...p, playoff_team_count: Number(e.target.value) }))
              }}
            >
              {presets.playoff.map((p) => (
                <option key={p.playoffTeamCount} value={p.playoffTeamCount}>{p.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Rookie draft / anti-tank */}
      {effective && constants && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Rookie draft order</h4>
          <p className="mt-1 text-xs text-white/65">
            Method: <span className="text-white/90">{effective.rookiePickOrderMethod}</span>
            {effective.useMaxPfForNonPlayoff && ' (non-playoff: reverse Max PF)'} · Rounds: {effective.rookieDraftRounds} · Type: {effective.rookieDraftType}
          </p>
          {isCommissioner && (
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
                value={effective.rookiePickOrderMethod}
                onChange={(e) => setPatch((p) => ({ ...p, rookiePickOrderMethod: e.target.value }))}
              >
                {constants.rookiePickOrderMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
                value={effective.rookieDraftType}
                onChange={(e) => setPatch((p) => ({ ...p, rookieDraftType: e.target.value }))}
              >
                <option value="linear">Linear</option>
                <option value="snake">Snake</option>
              </select>
              <input
                type="number"
                min={1}
                max={10}
                className="w-14 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
                value={effective.rookieDraftRounds}
                onChange={(e) => setPatch((p) => ({ ...p, rookieDraftRounds: Number(e.target.value) || 4 }))}
              />
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={effective.useMaxPfForNonPlayoff}
                  onChange={(e) => setPatch((p) => ({ ...p, useMaxPfForNonPlayoff: e.target.checked }))}
                />
                Max PF for non-playoff
              </label>
            </div>
          )}
        </div>
      )}

      {/* Taxi squad (PROMPT 3/5) */}
      {effective && (effective.taxiSlots != null || effective.taxiEligibilityYears != null) && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Taxi squad</h4>
          <p className="mt-1 text-xs text-white/65">
            Slots: {effective.taxiSlots ?? 4} · Eligibility: {effective.taxiEligibilityYears === 1 ? 'Rookies only' : effective.taxiEligibilityYears === 2 ? 'Rookies + 2nd year' : 'Rookies + 2nd + 3rd year'} · Lock: {effective.taxiLockBehavior === 'once_promoted_no_return' ? 'Once promoted cannot return' : effective.taxiLockBehavior === 'free_move' ? 'Can move freely' : 'Commissioner custom'}
            {effective.taxiInSeasonMoves !== false && ' · In-season moves on'}
            {effective.taxiPostseasonMoves && ' · Postseason moves on'}
            {effective.taxiScoringOn && ' · Scoring on taxi'}
            {(effective.taxiDeadlineWeek ?? effective.taxiPromotionDeadlineWeek) != null && ` · Deadlines: ${effective.taxiDeadlineWeek ?? '—'}/${effective.taxiPromotionDeadlineWeek ?? '—'}`}
          </p>
          {isCommissioner && constants?.taxiEligibilityYearsOptions && constants?.taxiLockBehaviorOptions && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <label className="text-xs text-white/80">
                Slots: <input type="number" min={0} max={20} className="w-12 rounded border border-white/20 bg-black/40 px-1 py-0.5 text-white" value={effective.taxiSlots ?? 4} onChange={(e) => setPatch((p) => ({ ...p, taxiSlots: Number(e.target.value) || 0 }))} />
              </label>
              <select className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white" value={effective.taxiEligibilityYears ?? 1} onChange={(e) => setPatch((p) => ({ ...p, taxiEligibilityYears: Number(e.target.value) }))}>
                {constants.taxiEligibilityYearsOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white" value={effective.taxiLockBehavior ?? 'once_promoted_no_return'} onChange={(e) => setPatch((p) => ({ ...p, taxiLockBehavior: e.target.value }))}>
                {constants.taxiLockBehaviorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input type="checkbox" checked={effective.taxiInSeasonMoves ?? true} onChange={(e) => setPatch((p) => ({ ...p, taxiInSeasonMoves: e.target.checked }))} />
                In-season moves
              </label>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input type="checkbox" checked={effective.taxiPostseasonMoves ?? false} onChange={(e) => setPatch((p) => ({ ...p, taxiPostseasonMoves: e.target.checked }))} />
                Postseason moves
              </label>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input type="checkbox" checked={effective.taxiScoringOn ?? false} onChange={(e) => setPatch((p) => ({ ...p, taxiScoringOn: e.target.checked }))} />
                Scoring on taxi
              </label>
            </div>
          )}
        </div>
      )}

      {/* Trade deadline, divisions, waivers */}
      {effective && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Waivers & trades</h4>
          <p className="mt-1 text-xs text-white/65">
            Waiver: {effective.waiverTypeRecommended} · Future picks: {effective.futurePicksYearsOut} years
            {effective.tradeDeadlineWeek != null && ` · Trade deadline: Week ${effective.tradeDeadlineWeek}`}
            {effective.divisionsEnabled && ' · Divisions enabled'}
          </p>
          {constants?.vetoRecommendationCopy && (
            <p className="mt-1 text-xs text-white/50 italic">{constants.vetoRecommendationCopy}</p>
          )}
          {isCommissioner && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <label className="text-xs text-white/80">
                Trade deadline week:{' '}
                <input
                  type="number"
                  min={1}
                  max={18}
                  className="w-12 rounded border border-white/20 bg-black/40 px-1 py-0.5 text-white"
                  value={effective.tradeDeadlineWeek ?? ''}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value)
                    setPatch((p) => ({ ...p, tradeDeadlineWeek: v }))
                  }}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={effective.divisionsEnabled}
                  onChange={(e) => setPatch((p) => ({ ...p, divisionsEnabled: e.target.checked }))}
                />
                Divisions
              </label>
            </div>
          )}
        </div>
      )}

      {isCommissioner && Object.keys(patch).length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded bg-white/90 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => setPatch({})}
            className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80"
          >
            Reset
          </button>
        </div>
      )}

      {(data.draftOrderAuditLog?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-xs font-medium text-white/80">Draft order overrides (audit)</h4>
          <ul className="mt-1 list-inside list-disc text-xs text-white/65">
            {(data.draftOrderAuditLog ?? []).slice(0, 5).map((l) => (
              <li key={l.id}>Season {l.season} · {l.reason ?? 'Override'}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
