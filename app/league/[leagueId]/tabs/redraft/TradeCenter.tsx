'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createTradeProposal,
  listTradeProposals,
  submitTradeVote,
  type RedraftRosterRow,
  type RedraftTradeProposal,
} from '@/lib/redraft/client'

export function TradeCenter({
  leagueId,
  seasonId,
  standings,
}: {
  leagueId: string
  seasonId: string | null
  standings: RedraftRosterRow[]
}) {
  const [proposals, setProposals] = useState<RedraftTradeProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createBusy, setCreateBusy] = useState(false)
  const [proposerRosterId, setProposerRosterId] = useState<string>('')
  const [receiverRosterId, setReceiverRosterId] = useState<string>('')
  const [reason, setReason] = useState('')

  const rosterNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of standings) map.set(r.id, r.teamName ?? r.id.slice(0, 6))
    return map
  }, [standings])

  const refresh = async () => {
    if (!seasonId) {
      setProposals([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await listTradeProposals({ leagueId, seasonId })
      setProposals(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trade proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [leagueId, seasonId])

  useEffect(() => {
    if (standings.length < 2) {
      setProposerRosterId('')
      setReceiverRosterId('')
      return
    }
    setProposerRosterId((prev) => (prev && standings.some((r) => r.id === prev) ? prev : standings[0]!.id))
    setReceiverRosterId((prev) => {
      if (prev && standings.some((r) => r.id === prev) && prev !== proposerRosterId) return prev
      const fallback = standings.find((r) => r.id !== standings[0]!.id)
      return fallback?.id ?? ''
    })
  }, [standings, proposerRosterId])

  const canCreate = Boolean(seasonId && proposerRosterId && receiverRosterId && proposerRosterId !== receiverRosterId)

  const onCreateProposal = async () => {
    if (!seasonId || !canCreate) return
    setCreateBusy(true)
    setError(null)
    try {
      await createTradeProposal({
        leagueId,
        seasonId,
        proposerRosterId,
        receiverRosterId,
        reason: reason.trim() || undefined,
      })
      setReason('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create proposal')
    } finally {
      setCreateBusy(false)
    }
  }

  const onAction = async (proposalId: string, action: Parameters<typeof submitTradeVote>[0]['action']) => {
    setBusyProposalId(proposalId)
    setError(null)
    try {
      await submitTradeVote({ proposalId, action })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`)
    } finally {
      setBusyProposalId(null)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-white">Trade Center</p>
          <p className="text-[11px] text-white/50">Proposals are stored in normalized redraft trade tables.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || !seasonId}
          className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/80 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 lg:grid-cols-4">
        <select
          aria-label="Proposer roster"
          value={proposerRosterId}
          onChange={(e) => setProposerRosterId(e.target.value)}
          className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
        >
          {standings.map((r) => (
            <option key={r.id} value={r.id}>
              From: {r.teamName ?? r.id.slice(0, 6)}
            </option>
          ))}
        </select>
        <select
          aria-label="Receiver roster"
          value={receiverRosterId}
          onChange={(e) => setReceiverRosterId(e.target.value)}
          className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
        >
          {standings.map((r) => (
            <option key={r.id} value={r.id}>
              To: {r.teamName ?? r.id.slice(0, 6)}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={() => void onCreateProposal()}
          disabled={createBusy || !canCreate}
          className="rounded bg-emerald-500/80 px-2 py-1 text-[11px] font-semibold text-black disabled:opacity-50"
        >
          {createBusy ? 'Creating...' : 'Create Proposal'}
        </button>
      </div>

      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}

      <div className="space-y-2">
        {proposals.length === 0 ? (
          <p className="text-[11px] text-white/45">No trade proposals yet.</p>
        ) : (
          proposals.map((p) => (
            <div key={p.id} className="rounded border border-white/10 bg-black/20 p-3 text-[11px] text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">
                  {rosterNameById.get(p.proposerRosterId) ?? p.proposerRosterId.slice(0, 6)}{' -> '}
                  {rosterNameById.get(p.receiverRosterId) ?? p.receiverRosterId.slice(0, 6)}
                </p>
                <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/60">
                  {p.status}
                </span>
              </div>
              <p className="mt-1 text-white/55">{p.reason || 'No reason provided.'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                  disabled={busyProposalId === p.id || p.status !== 'pending'}
                  onClick={() => void onAction(p.id, 'accept')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                  disabled={busyProposalId === p.id || p.status !== 'pending'}
                  onClick={() => void onAction(p.id, 'reject')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                  disabled={busyProposalId === p.id || p.status !== 'pending'}
                  onClick={() => void onAction(p.id, 'cancel')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                  disabled={busyProposalId === p.id || p.status !== 'pending'}
                  onClick={() => void onAction(p.id, 'vote_approve')}
                >
                  Vote Approve
                </button>
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                  disabled={busyProposalId === p.id || p.status !== 'pending'}
                  onClick={() => void onAction(p.id, 'vote_veto')}
                >
                  Vote Veto
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
