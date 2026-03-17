'use client'

import { useState, useCallback, useEffect } from 'react'
import { Shield, Trash2, Plus } from 'lucide-react'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'

export type KeeperPanelProps = {
  leagueId: string
  isCommissioner: boolean
  slotOrder: SlotOrderEntry[]
  currentUserRosterId: string | null
  rounds: number
  onSessionUpdate?: () => void
}

type KeeperApiState = {
  config: { maxKeepers: number; deadline?: string | null; maxKeepersPerPosition?: Record<string, number> }
  selections: Array<{ rosterId: string; roundCost: number; playerName: string; position: string; team: string | null; playerId: string | null; commissionerOverride?: boolean }>
  locks: unknown[]
  mySelections: Array<{ rosterId: string; roundCost: number; playerName: string; position: string; team: string | null }>
  currentUserRosterId: string | undefined
}

export function KeeperPanel({
  leagueId,
  isCommissioner,
  slotOrder,
  currentUserRosterId,
  rounds,
  onSessionUpdate,
}: KeeperPanelProps) {
  const [data, setData] = useState<KeeperApiState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [configSaving, setConfigSaving] = useState(false)

  const [addPlayerName, setAddPlayerName] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [addTeam, setAddTeam] = useState('')
  const [addRoundCost, setAddRoundCost] = useState(1)
  const [commissionerRosterId, setCommissionerRosterId] = useState<string>('')
  const [commissionerOverride, setCommissionerOverride] = useState(false)

  const [configMaxKeepers, setConfigMaxKeepers] = useState(3)
  const [configDeadline, setConfigDeadline] = useState('')

  const fetchKeepers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/keepers`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Failed to load keepers')
        setData(null)
        return
      }
      setData({
        config: json.config ?? { maxKeepers: 0 },
        selections: json.selections ?? [],
        locks: json.locks ?? [],
        mySelections: json.mySelections ?? [],
        currentUserRosterId: json.currentUserRosterId,
      })
      setConfigMaxKeepers(json.config?.maxKeepers ?? 3)
      setConfigDeadline(json.config?.deadline ? String(json.config.deadline).slice(0, 16) : '')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchKeepers()
  }, [fetchKeepers])

  const effectiveRosterId = isCommissioner && commissionerRosterId ? commissionerRosterId : (currentUserRosterId ?? data?.currentUserRosterId ?? '')
  const canAdd = data?.config?.maxKeepers != null && data.config.maxKeepers > 0 && effectiveRosterId && addPlayerName.trim() && addRoundCost >= 1 && addRoundCost <= rounds
  const isPreDraft = true

  const handleAddKeeper = useCallback(async () => {
    if (!canAdd || actionLoading) return
    setActionLoading('add')
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/keepers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rosterId: effectiveRosterId,
          roundCost: addRoundCost,
          playerName: addPlayerName.trim(),
          position: addPosition.trim() || '—',
          team: addTeam.trim() || null,
          commissionerOverride: isCommissioner && commissionerOverride,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.error == null) {
        setAddPlayerName('')
        setAddPosition('')
        setAddTeam('')
        await fetchKeepers()
        onSessionUpdate?.()
      } else {
        setError(json.error || 'Failed to add keeper')
      }
    } finally {
      setActionLoading(null)
    }
  }, [leagueId, canAdd, actionLoading, effectiveRosterId, addRoundCost, addPlayerName, addPosition, addTeam, isCommissioner, commissionerOverride, fetchKeepers, onSessionUpdate])

  const handleRemove = useCallback(async (rosterId: string, playerName: string) => {
    if (actionLoading) return
    setActionLoading('remove')
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/keepers/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId, playerName }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.error == null) {
        await fetchKeepers()
        onSessionUpdate?.()
      } else {
        setError(json.error || 'Failed to remove keeper')
      }
    } finally {
      setActionLoading(null)
    }
  }, [leagueId, actionLoading, fetchKeepers, onSessionUpdate])

  const handleSaveConfig = useCallback(async () => {
    if (!isCommissioner || configSaving) return
    setConfigSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/keepers/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxKeepers: configMaxKeepers,
          deadline: configDeadline.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        await fetchKeepers()
        onSessionUpdate?.()
      } else {
        setError(json.error || 'Failed to save config')
      }
    } finally {
      setConfigSaving(false)
    }
  }, [leagueId, isCommissioner, configSaving, configMaxKeepers, configDeadline, fetchKeepers, onSessionUpdate])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-white/50 text-sm">
        Loading keepers…
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-sm">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={fetchKeepers} className="rounded bg-white/10 px-2 py-1 text-white hover:bg-white/20">
          Retry
        </button>
      </div>
    )
  }

  const maxKeepers = data?.config?.maxKeepers ?? 0
  const mySelections = data?.mySelections ?? []
  const canEdit = isPreDraft && maxKeepers > 0

  return (
    <div className="flex h-full flex-col overflow-auto p-3 text-sm">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
        <Shield className="h-4 w-4 text-emerald-400" aria-hidden />
        Keepers
      </h3>
      {data && (
        <>
          <p className="mb-2 text-white/60">
            Max {maxKeepers} keeper{maxKeepers !== 1 ? 's' : ''} per team.
            {data.config?.deadline ? ` Deadline: ${new Date(data.config.deadline).toLocaleString()}` : ''}
          </p>
          {error && <p className="mb-2 text-red-400 text-xs">{error}</p>}

          {isCommissioner && (
            <section className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <h4 className="mb-2 font-medium text-white/90">Commissioner: config</h4>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-white/70">
                  Max keepers
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={configMaxKeepers}
                    onChange={(e) => setConfigMaxKeepers(Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)))}
                    className="ml-2 w-14 rounded border border-white/20 bg-black/40 px-1 py-0.5 text-white"
                  />
                </label>
                <label className="text-white/70">
                  Deadline
                  <input
                    type="datetime-local"
                    value={configDeadline}
                    onChange={(e) => setConfigDeadline(e.target.value)}
                    className="ml-2 rounded border border-white/20 bg-black/40 px-1 py-0.5 text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                  className="rounded bg-cyan-600 px-2 py-1 text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {configSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </section>
          )}

          <section className="mb-4">
            <h4 className="mb-2 font-medium text-white/90">My keepers</h4>
            <ul className="space-y-1">
              {mySelections.length === 0 ? (
                <li className="text-white/50">None selected.</li>
              ) : (
                mySelections.map((s, i) => (
                  <li key={`${s.rosterId}-${s.playerName}-${s.roundCost}-${i}`} className="flex items-center justify-between gap-2 rounded bg-white/5 py-1.5 px-2">
                    <span className="truncate text-white">
                      {s.playerName} · Rd{s.roundCost} · {s.position}
                      {s.team ? ` · ${s.team}` : ''}
                    </span>
                    {canEdit && (s.rosterId === currentUserRosterId || isCommissioner) && (
                      <button
                        type="button"
                        onClick={() => handleRemove(s.rosterId, s.playerName)}
                        disabled={!!actionLoading}
                        className="shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        aria-label={`Remove ${s.playerName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>

          {canEdit && (
            <section className="rounded-lg border border-white/10 bg-black/20 p-3">
              <h4 className="mb-2 flex items-center gap-1 font-medium text-white/90">
                <Plus className="h-3.5 w-3.5" /> Add keeper
              </h4>
              {isCommissioner && (
                <div className="mb-2">
                  <label className="text-white/70">Roster</label>
                  <select
                    value={(commissionerRosterId || currentUserRosterId) ?? ''}
                    onChange={(e) => setCommissionerRosterId(e.target.value)}
                    className="ml-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-white"
                  >
                    {slotOrder.map((s) => (
                      <option key={s.rosterId} value={s.rosterId}>
                        {s.displayName || `Slot ${s.slot}`}
                      </option>
                    ))}
                  </select>
                  <label className="ml-3 inline-flex items-center gap-1 text-white/70">
                    <input
                      type="checkbox"
                      checked={commissionerOverride}
                      onChange={(e) => setCommissionerOverride(e.target.checked)}
                    />
                    Override eligibility
                  </label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Player name"
                  value={addPlayerName}
                  onChange={(e) => setAddPlayerName(e.target.value)}
                  className="min-w-[100px] rounded border border-white/20 bg-black/40 px-2 py-1 text-white placeholder:text-white/40"
                />
                <input
                  type="text"
                  placeholder="Pos"
                  value={addPosition}
                  onChange={(e) => setAddPosition(e.target.value)}
                  className="w-12 rounded border border-white/20 bg-black/40 px-1 py-1 text-white placeholder:text-white/40"
                />
                <input
                  type="text"
                  placeholder="Team"
                  value={addTeam}
                  onChange={(e) => setAddTeam(e.target.value)}
                  className="w-14 rounded border border-white/20 bg-black/40 px-1 py-1 text-white placeholder:text-white/40"
                />
                <label className="text-white/70">
                  Round
                  <select
                    value={addRoundCost}
                    onChange={(e) => setAddRoundCost(parseInt(e.target.value, 10))}
                    className="ml-1 rounded border border-white/20 bg-black/40 px-1 py-1 text-white"
                  >
                    {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleAddKeeper}
                  disabled={!canAdd || !!actionLoading}
                  className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading === 'add' ? 'Adding…' : 'Add'}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
