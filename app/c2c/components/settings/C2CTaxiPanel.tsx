'use client'

import { useEffect, useState } from 'react'
import type { TaxiLockMode } from '@/lib/c2c/taxiLockResolver'

const OPTIONS: Array<{ value: TaxiLockMode; label: string; description: string }> = [
  {
    value: 'preseason',
    label: 'Preseason',
    description: 'Taxi locks ~1 week before the first game of the season.',
  },
  {
    value: 'start_of_season',
    label: 'Start of season',
    description: 'Taxi locks at the first primary game day each season.',
  },
  {
    value: 'no_limit',
    label: 'No limit',
    description: 'Taxi stays editable all year — moves allowed anytime.',
  },
]

export function C2CTaxiPanel({
  leagueId,
  canEdit = false,
  initialMode,
}: {
  leagueId?: string
  canEdit?: boolean
  initialMode?: TaxiLockMode
}) {
  const [mode, setMode] = useState<TaxiLockMode>(initialMode ?? 'no_limit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialMode) setMode(initialMode)
  }, [initialMode])

  const save = async (next: TaxiLockMode) => {
    if (!leagueId || !canEdit) return
    const prev = mode
    setMode(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/c2c/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId, taxiLockMode: next }),
      })
      if (!res.ok) {
        setMode(prev)
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Could not save')
      }
    } catch (e) {
      setMode(prev)
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 px-6 py-6 text-[13px] text-white/75" data-testid="c2c-taxi-panel">
      <p className="text-[12px] text-white/55">
        Controls when managers can move players onto or off the taxi squad. The deadline applies to
        both directions.
      </p>
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100/90">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const selected = mode === opt.value
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                selected
                  ? 'border-violet-500/60 bg-violet-500/10'
                  : 'border-white/[0.08] bg-black/20 hover:bg-white/[0.03]'
              } ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                type="radio"
                name="c2c-taxi-lock-mode"
                className="mt-1 accent-violet-500"
                checked={selected}
                disabled={!canEdit || saving}
                onChange={() => void save(opt.value)}
              />
              <div>
                <p className="text-[13px] font-semibold text-white">{opt.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>
      <label className="flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[12px]">
        <input type="checkbox" defaultChecked disabled />
        Rookie-only taxi
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" defaultChecked disabled />
        Taxi points visible (display only)
      </label>
    </div>
  )
}
