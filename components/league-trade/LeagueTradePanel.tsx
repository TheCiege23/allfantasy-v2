'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type AfTradeRow = {
  id: string
  status: string
  reviewType: string
  proposerRosterId: string
  receiverRosterId: string
  expiresAt: string | null
  acceptedAt: string | null
  processedAt: string | null
  items: Array<{ itemType: string; itemReference: string | null; fromRosterId: string; toRosterId: string }>
}

export function LeagueTradePanel({ leagueId }: { leagueId: string }) {
  const [trades, setTrades] = useState<AfTradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/trades`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load trades')
      const data = (await res.json()) as { trades: AfTradeRow[] }
      setTrades(data.trades ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const act = async (tradeId: string, path: string) => {
    setBusy(tradeId)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/trades/${encodeURIComponent(tradeId)}${path}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1228]/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">League trades</div>
          <div className="text-[15px] font-semibold text-white">Proposals & status</div>
        </div>
        <Link
          href={`/trade-evaluator?leagueId=${encodeURIComponent(leagueId)}`}
          className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-[12px] font-semibold text-cyan-200/90"
        >
          AI trade review
        </Link>
      </div>

      {loading ? <div className="text-[13px] text-white/50">Loading…</div> : null}
      {error ? <div className="text-[13px] text-amber-200/90">{error}</div> : null}

      {!loading && trades.length === 0 ? (
        <div className="text-[13px] text-white/50">No league trades yet. Use the API or a future builder to propose.</div>
      ) : null}

      <ul className="space-y-2">
        {trades.map((t) => (
          <li key={t.id} className="rounded-xl border border-white/8 bg-[#040915] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13px] font-semibold text-white/90">
                {t.status}
                <span className="ml-2 text-[11px] font-normal text-white/45">review: {t.reviewType}</span>
              </div>
              <div className="text-[11px] text-white/40">{t.id.slice(0, 8)}…</div>
            </div>
            <div className="mt-1 text-[11px] text-white/50">
              {t.items.length} asset(s)
              {t.expiresAt ? ` · expires ${new Date(t.expiresAt).toLocaleString()}` : ''}
            </div>
            {t.status === 'pending' ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === t.id}
                  className="rounded-lg bg-cyan-500/20 px-2 py-1 text-[12px] font-semibold text-cyan-100 disabled:opacity-50"
                  onClick={() => void act(t.id, '/accept')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy === t.id}
                  className="rounded-lg border border-white/15 px-2 py-1 text-[12px] text-white/80 disabled:opacity-50"
                  onClick={() => void act(t.id, '/reject')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy === t.id}
                  className="rounded-lg border border-white/15 px-2 py-1 text-[12px] text-white/60 disabled:opacity-50"
                  onClick={() => void act(t.id, '/cancel')}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
