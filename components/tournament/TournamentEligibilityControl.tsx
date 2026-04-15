'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const MODES = [
  { id: 'open', label: 'All rankings (default)' },
  { id: 'rank_bands', label: 'Restrict by ranking bands' },
  { id: 'invite_only', label: 'Invite-only override' },
] as const

export function TournamentEligibilityControl({
  tournamentId,
  mode,
  canEdit,
  onSaved,
}: {
  tournamentId: string
  mode: string
  canEdit: boolean
  onSaved: () => void
}) {
  const [value, setValue] = useState(mode)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const allowed = MODES.some((m) => m.id === mode)
    setValue(allowed ? mode : 'open')
  }, [mode])

  const save = useCallback(async () => {
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/legacy-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubSettings: { eligibilityMode: value } }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Could not save')
        return
      }
      toast.success('Eligibility updated')
      onSaved()
    } finally {
      setSaving(false)
    }
  }, [canEdit, onSaved, tournamentId, value])

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4" data-testid="tournament-eligibility-control">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Tournament eligibility</p>
      <p className="mt-1 text-xs text-white/50">
        By default, all AF rankings may join. Tighten only when you need bands or manual invites.
      </p>
      <select
        className="mt-3 w-full max-w-md rounded-lg border border-white/10 bg-[#0c1220] px-3 py-2 text-sm text-white"
        disabled={!canEdit}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canEdit || saving}
        onClick={() => void save()}
        className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save eligibility mode'}
      </button>
    </div>
  )
}
