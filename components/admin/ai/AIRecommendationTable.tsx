'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { DashboardFilterState } from '@/components/admin/ai/AIDashboardFilters'

type LogRow = {
  id: string
  type: string
  feature: string
  userEmail: string | null
  leagueName: string | null
  summary: string
  followed: boolean | null
  outcomeScore: number | null
  confidencePct: number | null
  createdAt: string
}

function buildQuery(f: DashboardFilterState, search: string, take: string, cursor?: string | null) {
  const p = new URLSearchParams({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    sport: f.sport,
    feature: f.feature,
    userSegment: f.userSegment,
    take,
  })
  if (search.trim()) p.set('search', search.trim())
  if (cursor) p.set('cursor', cursor)
  return p.toString()
}

export function AIRecommendationTable({ filters }: { filters: DashboardFilterState }) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows([])
    setNextCursor(null)
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const q = buildQuery(filters, search, '25', null)
        const res = await fetch(`/api/admin/ai/recommendations?${q}`)
        const json = (await res.json()) as {
          ok?: boolean
          rows?: LogRow[]
          nextCursor?: string | null
          error?: string
        }
        if (!res.ok || !json.ok) {
          setError(json.error || 'Failed to load')
          return
        }
        setRows(json.rows ?? [])
        setNextCursor(json.nextCursor ?? null)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    })()
  }, [filters.dateFrom, filters.dateTo, filters.sport, filters.feature, filters.userSegment])

  const applySearch = () => {
    setRows([])
    setNextCursor(null)
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const q = buildQuery(filters, search, '25', null)
        const res = await fetch(`/api/admin/ai/recommendations?${q}`)
        const json = (await res.json()) as {
          ok?: boolean
          rows?: LogRow[]
          nextCursor?: string | null
          error?: string
        }
        if (!res.ok || !json.ok) {
          setError(json.error || 'Failed to load')
          return
        }
        setRows(json.rows ?? [])
        setNextCursor(json.nextCursor ?? null)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    })()
  }

  const loadMore = () => {
    if (!nextCursor || loading) return
    void (async () => {
      setLoading(true)
      try {
        const q = buildQuery(filters, search, '25', nextCursor)
        const res = await fetch(`/api/admin/ai/recommendations?${q}`)
        const json = (await res.json()) as {
          ok?: boolean
          rows?: LogRow[]
          nextCursor?: string | null
          error?: string
        }
        if (!res.ok || !json.ok) return
        const list = json.rows ?? []
        setRows((prev) => [...prev, ...list])
        setNextCursor(json.nextCursor ?? null)
      } catch {
        /* noop */
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase text-white/45">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="email, feature, summary…"
            className="min-w-[220px] rounded-lg border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => applySearch()}
          className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100"
        >
          Apply search
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[960px] text-left text-[13px]">
          <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">User</th>
              <th className="px-2 py-2">League</th>
              <th className="px-2 py-2">Summary</th>
              <th className="px-2 py-2">Follow</th>
              <th className="px-2 py-2">Conf %</th>
              <th className="px-2 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-rose-300">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-white/45">
                  No recommendation logs in range.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-2 text-white/85">
                    <span className="block font-medium">{r.feature}</span>
                    <span className="text-[11px] text-white/45">{r.type}</span>
                  </td>
                  <td className="px-2 py-2 text-white/75">{r.userEmail ?? '—'}</td>
                  <td className="px-2 py-2 text-white/65">{r.leagueName ?? '—'}</td>
                  <td className="max-w-md px-2 py-2 text-white/70">{r.summary}</td>
                  <td className="px-2 py-2">
                    {r.followed === null ? (
                      <span className="text-white/35">—</span>
                    ) : r.followed ? (
                      <span className="text-emerald-400">yes</span>
                    ) : (
                      <span className="text-rose-300">no</span>
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-white/70">
                    {r.confidencePct != null ? r.confidencePct.toFixed(0) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-white/55">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : null}
        {nextCursor ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => loadMore()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85"
          >
            Load more
          </button>
        ) : null}
      </div>
    </div>
  )
}
