'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ImportProvider } from '@/lib/league-import/types'
import { IMPORT_PROVIDER_UI_OPTIONS } from '@/lib/league-import/provider-ui-config'
import type { ImportPreviewResponse } from '@/lib/league-import/ImportedLeaguePreviewBuilder'

type ApplyOptions = {
  leagueStructure: boolean
  rosters: boolean
  draftPicks: boolean
  scoringRules: boolean
  leagueName: boolean
}

const DEFAULT_APPLY_OPTIONS: ApplyOptions = {
  leagueStructure: true,
  rosters: true,
  draftPicks: true,
  scoringRules: true,
  leagueName: true,
}

const PROVIDER_HELP: Partial<Record<ImportProvider, string>> = {
  sleeper: 'Sleeper league ID (from league URL or settings)',
  espn: 'ESPN league ID, season:id, or ESPN league URL',
  yahoo: 'Yahoo league key (e.g. 461.l.12345) or numeric league id',
  fantrax: 'Fantrax source id (or legacy resolver source)',
  mfl: 'MyFantasyLeague id (or season:id)',
}

export default function LeagueImportPanel({ leagueId }: { leagueId: string }) {
  const [provider, setProvider] = useState<ImportProvider>('sleeper')
  const [sourceId, setSourceId] = useState('')
  const [apply, setApply] = useState<ApplyOptions>(DEFAULT_APPLY_OPTIONS)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const availableProviders = useMemo(
    () => IMPORT_PROVIDER_UI_OPTIONS.filter((opt) => opt.available),
    []
  )

  const setApplyField = useCallback((key: keyof ApplyOptions, value: boolean) => {
    setApply((prev) => ({ ...prev, [key]: value }))
  }, [])

  const loadPreview = useCallback(async () => {
    if (!leagueId || !sourceId.trim()) return
    setLoadingPreview(true)
    setError(null)
    setResultMessage(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          sourceId: sourceId.trim(),
          apply,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed to fetch import preview')
        setPreview(null)
        return
      }
      setPreview((json.preview as ImportPreviewResponse) ?? null)
      if (json.apply && typeof json.apply === 'object') {
        setApply({
          leagueStructure: (json.apply as ApplyOptions).leagueStructure !== false,
          rosters: (json.apply as ApplyOptions).rosters !== false,
          draftPicks: (json.apply as ApplyOptions).draftPicks !== false,
          scoringRules: (json.apply as ApplyOptions).scoringRules !== false,
          leagueName: (json.apply as ApplyOptions).leagueName !== false,
        })
      }
    } catch {
      setError('Failed to fetch import preview')
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [leagueId, provider, sourceId, apply])

  const applyImport = useCallback(async () => {
    if (!leagueId || !sourceId.trim()) return
    setCommitting(true)
    setError(null)
    setResultMessage(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          sourceId: sourceId.trim(),
          apply,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed to apply league import')
        return
      }
      const rostersCount = Number(json?.summary?.rostersUpserted ?? 0)
      const picksCount = Number(json?.summary?.draftPicksImported ?? 0)
      setResultMessage(
        `Import applied to ${json.leagueName ?? 'league'}: ${rostersCount} rosters synced, ${picksCount} draft picks imported.`
      )
    } catch {
      setError('Failed to apply league import')
    } finally {
      setCommitting(false)
    }
  }, [leagueId, provider, sourceId, apply])

  return (
    <section className="space-y-5 rounded-xl border border-white/10 bg-black/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">League import</h3>
        <p className="mt-1 text-xs text-white/65">
          Deterministically import league structure, rosters, draft picks, scoring rules, and league name from supported platforms.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-white/75">
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ImportProvider)}
            data-testid="commissioner-import-provider-select"
            className="mt-1 w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {availableProviders.map((opt) => (
              <option key={opt.provider} value={opt.provider}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/75">
          Source ID
          <input
            type="text"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder={PROVIDER_HELP[provider] ?? 'Enter source id'}
            data-testid="commissioner-import-source-input"
            className="mt-1 w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <p className="text-xs text-white/50">{PROVIDER_HELP[provider]}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadPreview}
          disabled={loadingPreview || !sourceId.trim()}
          data-testid="commissioner-import-preview-button"
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {loadingPreview ? 'Loading preview…' : 'Fetch import preview'}
        </button>
      </div>

      {preview ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white" data-testid="commissioner-import-preview-name">
                {preview.league.name}
              </p>
              <p className="text-xs text-white/60">
                {preview.league.sport} • {preview.league.teamCount} teams • season {preview.league.season ?? 'n/a'}
              </p>
            </div>
            <p className="text-xs text-cyan-200">
              Draft picks: {preview.draftPickCount} • Scoring rules: {preview.playerMap ? (Object.keys(preview.playerMap).length > 0 ? 'available' : 'partial') : 'missing'}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={apply.leagueStructure}
                onChange={(e) => setApplyField('leagueStructure', e.target.checked)}
                data-testid="commissioner-import-toggle-league-structure"
                className="rounded border-white/20"
              />
              Import league structure
            </label>
            <label className="flex items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={apply.rosters}
                onChange={(e) => setApplyField('rosters', e.target.checked)}
                data-testid="commissioner-import-toggle-rosters"
                className="rounded border-white/20"
              />
              Import rosters
            </label>
            <label className="flex items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={apply.draftPicks}
                onChange={(e) => setApplyField('draftPicks', e.target.checked)}
                data-testid="commissioner-import-toggle-draft-picks"
                className="rounded border-white/20"
              />
              Import draft picks
            </label>
            <label className="flex items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={apply.scoringRules}
                onChange={(e) => setApplyField('scoringRules', e.target.checked)}
                data-testid="commissioner-import-toggle-scoring-rules"
                className="rounded border-white/20"
              />
              Import scoring rules
            </label>
            <label className="flex items-center gap-2 text-xs text-white/85">
              <input
                type="checkbox"
                checked={apply.leagueName}
                onChange={(e) => setApplyField('leagueName', e.target.checked)}
                data-testid="commissioner-import-toggle-league-name"
                className="rounded border-white/20"
              />
              Import league name
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyImport}
              disabled={committing}
              data-testid="commissioner-import-commit-button"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {committing ? 'Applying import…' : 'Apply import to this league'}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-400/90" data-testid="commissioner-import-error">{error}</p>
      ) : null}
      {resultMessage ? (
        <p className="text-xs text-emerald-300" data-testid="commissioner-import-result">{resultMessage}</p>
      ) : null}
    </section>
  )
}
