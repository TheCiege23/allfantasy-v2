'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { getSportOptions } from '@/lib/commissioner-settings'
import { toast } from 'sonner'

type Config = {
  id: string
  name: string | null
  description: string | null
  sport: string
  season: number | null
  leagueSize: number | null
  rosterSize: number | null
}

export default function GeneralSettingsPanel({ leagueId }: { leagueId?: string }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('NFL')
  const [season, setSeason] = useState('')

  const sportOptions = getSportOptions()

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
        setError(data?.error || 'Failed to load settings')
        setConfig(null)
        return
      }
      setConfig(data)
      setName(data.name ?? '')
      setDescription(data.description ?? '')
      setSport(data.sport ?? 'NFL')
      setSeason(data.season != null ? String(data.season) : '')
    } catch {
      setError('Failed to load settings')
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = () => {
    if (config) {
      setName(config.name ?? '')
      setDescription(config.description ?? '')
      setSport(config.sport ?? 'NFL')
      setSeason(config.season != null ? String(config.season) : '')
    }
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
          name: name.trim() || null,
          description: description.trim() || null,
          sport: sport || undefined,
          season: season.trim() ? parseInt(season, 10) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Failed to save')
        return
      }
      setConfig(data)
      setEditing(false)
      toast.success('General settings saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">General Settings</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to view and edit general settings.</p>
      </section>
    )
  }

  if (loading && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">General Settings</h3>
        <p className="mt-2 text-xs text-white/65 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </p>
      </section>
    )
  }

  if (error && !config) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">General Settings</h3>
        <p className="mt-2 text-xs text-red-400">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">General Settings</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
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
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-white/65">League name, description, sport, and season. Only commissioners can edit.</p>

      <dl className="mt-4 space-y-3">
        {editing ? (
          <>
            <div>
              <label className="block text-xs text-white/50 mb-1">League name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="My League"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 resize-none"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                {sportOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Season (year)</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="e.g. 2025"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="text-xs text-white/50">League name</dt>
              <dd className="text-sm text-white/90">{config?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Description</dt>
              <dd className="text-sm text-white/90">{config?.description || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Sport</dt>
              <dd className="text-sm text-white/90">{config?.sport ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Season</dt>
              <dd className="text-sm text-white/90">{config?.season ?? '—'}</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  )
}
