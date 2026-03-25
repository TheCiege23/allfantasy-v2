'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

type Config = {
  settings?: Record<string, unknown> | null
}

const TRADE_REVIEW_OPTIONS = [
  { value: 'none', label: 'No review' },
  { value: 'commissioner', label: 'Commissioner review' },
  { value: 'league_vote', label: 'League vote' },
  { value: 'instant', label: 'Instant accept' },
]

export default function TradeSettingsPanel({ leagueId }: { leagueId?: string }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tradeReviewType, setTradeReviewType] = useState('commissioner')
  const [vetoThreshold, setVetoThreshold] = useState('')

  const hydrateDraft = useCallback((next: Config | null) => {
    setConfig(next)
    const settings = next?.settings ?? {}
    const resolvedType =
      (typeof settings.tradeReviewType === 'string' && settings.tradeReviewType) ||
      (typeof settings.trade_review_mode === 'string' && settings.trade_review_mode) ||
      'commissioner'
    const resolvedVeto =
      typeof settings.vetoThreshold === 'number'
        ? settings.vetoThreshold
        : typeof settings.veto_threshold === 'number'
        ? settings.veto_threshold
        : null
    setTradeReviewType(String(resolvedType))
    setVetoThreshold(resolvedVeto == null ? '' : String(resolvedVeto))
  }, [])

  const load = useCallback(async () => {
    if (!leagueId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/settings`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Failed to load trade settings')
        setConfig(null)
        return
      }
      hydrateDraft(data)
    } catch {
      setError('Failed to load trade settings')
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [hydrateDraft, leagueId])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = () => {
    hydrateDraft(config)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!leagueId || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeReviewType,
          vetoThreshold: vetoThreshold.trim() ? parseInt(vetoThreshold, 10) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save trade settings')
        return
      }
      hydrateDraft(data)
      setEditing(false)
      toast.success('Trade settings saved')
    } catch {
      toast.error('Failed to save trade settings')
    } finally {
      setSaving(false)
    }
  }

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Trade Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view and edit trade rules.</p>
      </section>
    )
  }

  if (loading && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Trade Settings</h3>
        <p className="mt-2 flex items-center gap-2 text-xs text-white/65">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </p>
      </section>
    )
  }

  if (error && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Trade Settings</h3>
        <p className="mt-2 text-xs text-red-400">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Trade Settings</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-testid="commissioner-trade-edit"
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              data-testid="commissioner-trade-cancel"
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              data-testid="commissioner-trade-save"
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-white/65">Configure trade review mode and league-vote veto threshold.</p>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Trade review type</label>
            <select
              value={tradeReviewType}
              onChange={(e) => setTradeReviewType(e.target.value)}
              data-testid="commissioner-trade-review-type-select"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            >
              {TRADE_REVIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Veto threshold (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={vetoThreshold}
              onChange={(e) => setVetoThreshold(e.target.value)}
              data-testid="commissioner-veto-threshold-input"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder="e.g. 4"
            />
          </div>
        </div>
      ) : (
        <dl className="mt-4 space-y-2">
          <div>
            <dt className="text-xs text-white/50">Trade review type</dt>
            <dd className="text-sm text-white/90" data-testid="commissioner-trade-review-type-value">
              {tradeReviewType || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Veto threshold</dt>
            <dd className="text-sm text-white/90">{vetoThreshold || '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
