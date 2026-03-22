'use client'

/**
 * PROMPT 3: Offseason promotion panel. Lists promotion-eligible devy rights; manager can promote (with pro player id).
 * Shows task banner when roster is illegal (full).
 */

import { useEffect, useState } from 'react'

interface EligibleItem {
  rightsId: string
  rosterId: string
  platformUserId: string
  devyPlayerId: string
  devyPlayer: { name: string; position: string; school: string; draftEligibleYear: number | null } | null
  promotedProPlayerId: string | null
  seasonYear: number | null
}

interface PromotionResponse {
  eligible: EligibleItem[]
  seasonYear: number
  config: { promotionTiming: string; maxYearlyDevyPromotions: number | null } | null
  promotionWindow?: {
    timing: string
    timingLabel: string
    deadlineIso: string | null
  }
}

interface Props {
  leagueId: string
  rosterId?: string
  isCommissioner?: boolean
}

export function DevyPromotionPanel({ leagueId, rosterId, isCommissioner }: Props) {
  const [data, setData] = useState<PromotionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchEligible() {
      try {
        const url = new URL(`/api/leagues/${encodeURIComponent(leagueId)}/devy/promotion`, window.location.origin)
        if (rosterId) url.searchParams.set('rosterId', rosterId)
        const res = await fetch(url.toString(), { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Not found' : 'Failed to load')
          setLoading(false)
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        if (active) setError('Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchEligible()
    return () => { active = false }
  }, [leagueId, rosterId])

  const handlePromote = async (rightsId: string, promotedProPlayerId: string) => {
    setPromoting(rightsId)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/devy/promotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rightsId, promotedProPlayerId, addToRoster: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((json as { error?: string }).error ?? 'Promotion failed')
        return
      }
      setData((prev) =>
        prev
          ? { ...prev, eligible: prev.eligible.filter((e) => e.rightsId !== rightsId) }
          : null
      )
    } catch {
      setError('Promotion failed')
    } finally {
      setPromoting(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <span className="text-sm text-white/60">Loading promotion-eligible…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        {error}
      </div>
    )
  }

  if (!data || data.eligible.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white">Offseason promotion</h3>
        <p className="mt-1 text-xs text-white/50">No promotion-eligible devy players right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white">Offseason Promotion Center</h3>
      <p className="text-xs text-white/60">
        {data.promotionWindow?.timingLabel
          ? data.promotionWindow.timingLabel
          : data.config?.promotionTiming === 'manager_choice_before_rookie_draft'
            ? 'Choose promotions before the rookie draft deadline.'
            : 'Promotion-eligible players (drafted to pro).'}
      </p>
      {data.promotionWindow?.deadlineIso && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Promotion deadline: {new Date(data.promotionWindow.deadlineIso).toLocaleDateString()}.
        </div>
      )}
      {(data.config?.promotionTiming === 'immediate_after_pro_draft' ||
        data.config?.promotionTiming === 'rollover') && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
          Auto-promotion timing is enabled by league settings. Commissioner lifecycle sync applies queued transitions.
        </div>
      )}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200">
        If your roster is full, create space before promoting. Promoted players are excluded from the rookie draft pool.
      </div>
      {error && (
        <div className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {data.eligible.map((item) => (
          <li
            key={item.rightsId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-2"
          >
            <div>
              <span className="font-medium text-white">
                {item.devyPlayer?.name ?? item.devyPlayerId}
              </span>
              {item.devyPlayer && (
                <span className="ml-2 text-xs text-white/50">
                  {item.devyPlayer.position} · {item.devyPlayer.school}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Pro player ID"
                className="w-32 rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40"
                id={`pro-${item.rightsId}`}
              />
              <button
                type="button"
                disabled={!!promoting}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                onClick={() => {
                  const input = document.getElementById(`pro-${item.rightsId}`) as HTMLInputElement
                  const proId = input?.value?.trim()
                  if (proId) handlePromote(item.rightsId, proId)
                }}
              >
                {promoting === item.rightsId ? 'Promoting…' : 'Promote'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
