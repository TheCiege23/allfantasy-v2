'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useEntitlement } from '@/hooks/useEntitlement'

type FlagRow = {
  id: string
  flagType: string
  severity: string
  status: string
  summary: string
  aiConfidence: number
  tradeTransactionId: string | null
  createdAt: string
  evidenceJson: unknown
}

export default function CommissionerIntegrityPage() {
  const params = useParams<{ leagueId: string }>()
  const leagueId = params.leagueId
  const { hasAccess, loading: entLoading, upgradePath } = useEntitlement('commissioner_integrity_monitoring')
  const ok = hasAccess('commissioner_integrity_monitoring')

  const [tab, setTab] = useState<'open' | 'dismissed'>('open')
  const [openFlags, setOpenFlags] = useState<FlagRow[]>([])
  const [dismissed, setDismissed] = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/integrity`, { cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as {
        openFlags?: FlagRow[]
        recentDismissed?: FlagRow[]
        error?: string
      }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setOpenFlags(json.openFlags ?? [])
      setDismissed(json.recentDismissed ?? [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [leagueId, ok])

  useEffect(() => {
    void load()
  }, [load])

  const patchFlag = async (flagId: string, status: 'dismissed' | 'escalated') => {
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/integrity/flags/${encodeURIComponent(flagId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      toast.success(status === 'dismissed' ? 'Dismissed.' : 'Escalated.')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  if (entLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-white/60">
        Loading…
      </main>
    )
  }

  if (!ok) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center text-white">
        <h1 className="text-lg font-semibold">Integrity Monitor</h1>
        <p className="mt-2 text-sm text-white/55">Requires AF Commissioner — integrity monitoring entitlement.</p>
        <Link href={upgradePath} className="mt-4 inline-block text-cyan-300 hover:underline">
          Upgrade →
        </Link>
      </main>
    )
  }

  const list = tab === 'open' ? openFlags : dismissed

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">🔍 League Integrity Monitor</h1>
          <p className="text-xs text-white/45">On-field actions only — no chat or DM access.</p>
        </div>
        <Link href={`/league/${leagueId}`} className="text-xs text-cyan-300/90 hover:underline">
          ← Back to league
        </Link>
      </div>

      <div className="mb-4 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`rounded-full px-3 py-1 ${tab === 'open' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-white/50'}`}
        >
          Open Flags ({openFlags.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('dismissed')}
          className={`rounded-full px-3 py-1 ${tab === 'dismissed' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-white/50'}`}
        >
          Dismissed
        </button>
      </div>

      {loading ? <p className="text-sm text-white/45">Loading flags…</p> : null}

      <div className="space-y-3">
        {!loading &&
          list.map((f) => (
            <div key={f.id} className="rounded-xl border border-white/10 bg-[#0a1328] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-200/90">
                  [{f.severity.toUpperCase()}] {f.flagType === 'collusion' ? 'Collusion' : 'Tanking'}
                </span>
                <span className="text-white/35">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-white/80">{f.summary}</p>
              <p className="mt-2 text-white/45">AI confidence: {Math.round(f.aiConfidence * 100)}%</p>
              {f.tradeTransactionId ? (
                <p className="mt-1 text-white/35">Trade id: {f.tradeTransactionId}</p>
              ) : null}
              {tab === 'open' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void patchFlag(f.id, 'dismissed')}
                    className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/80"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => void patchFlag(f.id, 'escalated')}
                    className="rounded-lg border border-amber-500/30 px-2 py-1 text-[11px] text-amber-200"
                  >
                    Escalate
                  </button>
                  {f.tradeTransactionId ? (
                    <Link
                      href={`/league/${leagueId}`}
                      className="rounded-lg border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-200"
                    >
                      League home →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
      </div>

      {!loading && list.length === 0 ? <p className="text-sm text-white/40">No flags in this tab.</p> : null}
    </main>
  )
}
