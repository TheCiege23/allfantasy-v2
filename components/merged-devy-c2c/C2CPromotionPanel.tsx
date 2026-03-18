'use client'

/**
 * PROMPT 3: C2C promotion center. Lists promotion-eligible rights; manager can promote with pro player id.
 * Shows banner when roster is illegal (full).
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
  config: { promotionTiming: string; maxPromotionsPerYear: number | null } | null
}

interface Props {
  leagueId: string
  rosterId?: string
  isCommissioner?: boolean
}

export function C2CPromotionPanel({ leagueId, rosterId }: Props) {
  const [data, setData] = useState<PromotionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchEligible() {
      try {
        const url = new URL(`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/promotion`, window.location.origin)
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
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/promotion`, {
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
    } finally {
      setPromoting(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white">Promotion center</h3>
        <p className="mt-1 text-xs text-white/50">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white">Promotion center</h3>
        <p className="mt-1 text-sm text-amber-400">{error}</p>
      </div>
    )
  }

  if (!data || data.eligible.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-medium text-white">Promotion center</h3>
        <p className="mt-1 text-xs text-white/50">No promotion-eligible college assets. When your college players are drafted, they will appear here.</p>
        <a
          href={`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/audit?limit=20`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-cyan-300 hover:underline"
        >
          Audit timeline →
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-medium text-white">Promotion center</h3>
      <p className="text-xs text-amber-200/90 mt-1">If your pro roster is full, create space before promoting. Illegal roster blocks promotion.</p>
      <p className="mt-1 text-xs text-white/50">
        Season {data.seasonYear}. {data.config?.maxPromotionsPerYear != null ? `Max ${data.config.maxPromotionsPerYear} promotions per year.` : 'No promotion cap.'}
      </p>
      {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}
      <ul className="mt-3 space-y-2">
        {data.eligible.map((e) => (
          <li key={e.rightsId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-2 text-sm">
            <span className="text-white">
              {e.devyPlayer?.name ?? e.devyPlayerId} ({e.devyPlayer?.position ?? '—'})
              {e.devyPlayer?.school && ` · ${e.devyPlayer.school}`}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Pro player ID"
                className="w-32 rounded border border-white/20 bg-black/20 px-2 py-1 text-white placeholder:text-white/40"
                id={`pro-${e.rightsId}`}
              />
              <button
                type="button"
                disabled={!!promoting}
                className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                onClick={() => {
                  const input = document.getElementById(`pro-${e.rightsId}`) as HTMLInputElement
                  const id = input?.value?.trim()
                  if (id) handlePromote(e.rightsId, id)
                }}
              >
                {promoting === e.rightsId ? 'Promoting…' : 'Promote'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <a
        href={`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/audit?limit=30`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-cyan-300 hover:underline"
      >
        Audit timeline →
      </a>
    </div>
  )
}
