'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

type Config = {
  rosterSize: number | null
  leagueSize: number | null
  starters?: unknown
  settings?: Record<string, unknown> | null
}

function normalizePositions(config: Config | null): string[] {
  if (!config) return []
  const fromSettings = config.settings?.rosterPositions
  if (Array.isArray(fromSettings)) {
    return fromSettings
      .map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : ''))
      .filter((p) => p.length > 0)
  }
  if (Array.isArray(config.starters)) {
    return config.starters
      .map((p) => (typeof p === 'string' ? p.trim().toUpperCase() : ''))
      .filter((p) => p.length > 0)
  }
  if (config.starters && typeof config.starters === 'object') {
    return Object.entries(config.starters as Record<string, unknown>).flatMap(([position, count]) => {
      const normalized = position.trim().toUpperCase()
      const total = Number(count)
      if (!normalized || !Number.isFinite(total) || total <= 0) return []
      return Array.from({ length: Math.min(30, Math.floor(total)) }, () => normalized)
    })
  }
  return []
}

function buildStarterCounts(positions: string[]): Record<string, number> {
  return positions.reduce<Record<string, number>>((acc, position) => {
    const key = position.trim().toUpperCase()
    if (!key) return acc
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

export default function RosterSettingsPanel({ leagueId }: { leagueId?: string }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rosterSize, setRosterSize] = useState('')
  const [leagueSize, setLeagueSize] = useState('')
  const [benchSize, setBenchSize] = useState('')
  const [positions, setPositions] = useState('')

  const hydrateDraft = useCallback((next: Config | null) => {
    setConfig(next)
    const bench = next?.settings?.benchSize
    setRosterSize(next?.rosterSize != null ? String(next.rosterSize) : '')
    setLeagueSize(next?.leagueSize != null ? String(next.leagueSize) : '')
    setBenchSize(typeof bench === 'number' ? String(bench) : '')
    setPositions(normalizePositions(next).join(', '))
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
        setError(data?.error || 'Failed to load roster settings')
        setConfig(null)
        return
      }
      hydrateDraft(data)
    } catch {
      setError('Failed to load roster settings')
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
    const parsedPositions = positions
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean)
    const payload = {
      rosterSize: rosterSize.trim() ? parseInt(rosterSize, 10) : null,
      leagueSize: leagueSize.trim() ? parseInt(leagueSize, 10) : null,
      benchSize: benchSize.trim() ? parseInt(benchSize, 10) : null,
      rosterPositions: parsedPositions,
      starters: buildStarterCounts(parsedPositions),
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save roster settings')
        return
      }
      hydrateDraft(data)
      setEditing(false)
      toast.success('Roster settings saved')
    } catch {
      toast.error('Failed to save roster settings')
    } finally {
      setSaving(false)
    }
  }

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Roster Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view and edit roster settings.</p>
      </section>
    )
  }

  if (loading && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Roster Settings</h3>
        <p className="mt-2 flex items-center gap-2 text-xs text-white/65">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </p>
      </section>
    )
  }

  if (error && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Roster Settings</h3>
        <p className="mt-2 text-xs text-red-400">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Roster Settings</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-testid="commissioner-roster-edit"
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
              data-testid="commissioner-roster-cancel"
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              data-testid="commissioner-roster-save"
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-white/65">
        Configure roster size, lineup positions, and bench size.
      </p>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Roster size</label>
            <input
              type="number"
              min={1}
              max={100}
              value={rosterSize}
              onChange={(e) => setRosterSize(e.target.value)}
              data-testid="commissioner-roster-size-input"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">League size (teams)</label>
            <input
              type="number"
              min={2}
              max={32}
              value={leagueSize}
              onChange={(e) => setLeagueSize(e.target.value)}
              data-testid="commissioner-league-size-input"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Bench size</label>
            <input
              type="number"
              min={0}
              max={60}
              value={benchSize}
              onChange={(e) => setBenchSize(e.target.value)}
              data-testid="commissioner-bench-size-input"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Positions (comma-separated)</label>
            <input
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
              data-testid="commissioner-roster-positions-input"
              placeholder="QB, RB, RB, WR, WR, TE, FLEX"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      ) : (
        <dl className="mt-4 space-y-2">
          <div>
            <dt className="text-xs text-white/50">Roster size</dt>
            <dd className="text-sm text-white/90" data-testid="commissioner-roster-size-value">{config?.rosterSize ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">League size</dt>
            <dd className="text-sm text-white/90">{config?.leagueSize ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Bench size</dt>
            <dd className="text-sm text-white/90">{typeof config?.settings?.benchSize === 'number' ? config.settings.benchSize : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/50">Positions</dt>
            <dd className="text-sm text-white/90">{normalizePositions(config).join(', ') || '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
