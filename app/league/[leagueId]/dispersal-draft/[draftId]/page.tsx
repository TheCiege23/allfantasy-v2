'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import type { DispersalAsset, DispersalDraftState } from '@/lib/dispersal-draft/types'

const POLL_MS = 5000 as const

type LeagueSettingsBrief = {
  userRole?: string | null
  league: { teams: { id: string; externalId?: string; teamName: string; ownerName: string; avatarUrl?: string | null }[] }
}

function rosterNameMap(teams: LeagueSettingsBrief['league']['teams']): (rid: string) => string {
  const byExt = new Map(teams.map((t) => [t.externalId ?? '', t.teamName || t.ownerName]))
  const byId = new Map(teams.map((t) => [t.id, t.teamName || t.ownerName]))
  return (rid: string) => byExt.get(rid) ?? byId.get(rid) ?? `Team ${rid.slice(0, 6)}`
}

export default function DispersalDraftLivePage() {
  const params = useParams<{ leagueId: string; draftId: string }>()
  const leagueId = params.leagueId
  const draftId = params.draftId

  const [state, setState] = useState<DispersalDraftState | null>(null)
  const [settings, setSettings] = useState<LeagueSettingsBrief | null>(null)
  const [myRosterId, setMyRosterId] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'player' | 'draft_pick' | 'faab'>('all')
  const [pickBusy, setPickBusy] = useState(false)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const timeoutSentForPickRef = useRef<string | null>(null)

  const loadState = useCallback(async () => {
    const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/state`, {
      cache: 'no-store',
    })
    const json = (await res.json().catch(() => ({}))) as DispersalDraftState & { error?: string }
    if (!res.ok) {
      const err = (json as { error?: string }).error ?? 'Could not load draft'
      setPollError(err)
      return
    }
    setPollError(null)
    setState(json)
  }, [draftId, leagueId])

  useEffect(() => {
    void loadState()
  }, [loadState])

  useEffect(() => {
    if (state?.status === 'completed' || state?.status === 'cancelled') return
    const t = window.setInterval(() => {
      void loadState()
    }, POLL_MS)
    return () => window.clearInterval(t)
  }, [loadState, state?.status])

  useEffect(() => {
    void (async () => {
      const [ls, rv] = await Promise.all([
        fetch(`/api/league/settings?leagueId=${encodeURIComponent(leagueId)}`).then((r) => r.json()),
        fetch(`/api/leagues/${encodeURIComponent(leagueId)}/roster/me`).then((r) => r.json()),
      ])
      setSettings(ls as LeagueSettingsBrief)
      const rid = typeof (rv as { rosterId?: string }).rosterId === 'string' ? (rv as { rosterId: string }).rosterId : null
      setMyRosterId(rid)
    })().catch(() => {})
  }, [leagueId])

  const nameFor = useMemo(() => {
    const teams = settings?.league?.teams ?? []
    return rosterNameMap(teams)
  }, [settings])

  const pickTimeSeconds = state?.pickTimeSeconds ?? 0

  useEffect(() => {
    if (!state || state.status !== 'in_progress' || pickTimeSeconds <= 0) {
      setDeadline(null)
      return
    }
    setDeadline(Date.now() + pickTimeSeconds * 1000)
  }, [state?.currentPickIndex, state?.status, state?.currentRosterId, pickTimeSeconds, state])

  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!deadline) return
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [deadline])

  const secondsLeft = useMemo(() => {
    if (!deadline) return 0
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  }, [deadline, tick])

  const currentRosterId = state?.currentRosterId ?? null
  const isMyTurn = Boolean(myRosterId && currentRosterId === myRosterId)
  const isPassed = Boolean(myRosterId && state?.passedRosterIds.includes(myRosterId))

  useEffect(() => {
    timeoutSentForPickRef.current = null
  }, [state?.currentPickIndex, state?.currentRosterId])

  useEffect(() => {
    if (!state || state.status !== 'in_progress') return
    if (!state.autoPickOnTimeout || pickTimeSeconds <= 0) return
    if (!isMyTurn || !myRosterId || isPassed) return
    if (secondsLeft > 0) return
    const key = `${state.currentPickIndex}-${state.currentPickNumber}-${myRosterId}`
    if (timeoutSentForPickRef.current === key) return
    timeoutSentForPickRef.current = key
    void (async () => {
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/timeout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rosterId: myRosterId }),
          }
        )
        const json = (await res.json().catch(() => ({}))) as DispersalDraftState & { error?: string }
        if (!res.ok) {
          timeoutSentForPickRef.current = null
          return
        }
        setState(json)
      } catch {
        timeoutSentForPickRef.current = null
      }
    })()
  }, [
    draftId,
    isMyTurn,
    isPassed,
    leagueId,
    myRosterId,
    pickTimeSeconds,
    secondsLeft,
    state,
  ])
  const participants = state?.participantRosterIds ?? []

  const pool = state?.assetPool ?? []
  const filtered: DispersalAsset[] = useMemo(() => {
    if (tab === 'all') return pool.filter((a) => a.isAvailable)
    return pool.filter((a) => a.isAvailable && a.assetType === tab)
  }, [pool, tab])

  const roundNo =
    state && state.picksPerRound > 0
      ? Math.ceil(state.currentPickNumber / Math.max(1, state.picksPerRound))
      : 1
  const pickInRoundNo =
    state && state.picksPerRound > 0
      ? ((state.currentPickNumber - 1) % Math.max(1, state.picksPerRound)) + 1
      : state?.currentPickNumber ?? 1

  const submitPick = async (assetId: string) => {
    if (!myRosterId) return
    setPickBusy(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/pick`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetId }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as DispersalDraftState & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Pick failed')
      setState(json as DispersalDraftState)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Pick failed')
    } finally {
      setPickBusy(false)
    }
  }

  const submitPass = async () => {
    if (!myRosterId) return
    if (!window.confirm('Pass for the rest of this dispersal draft?')) return
    setPickBusy(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/pass`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rosterId: myRosterId }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as { draft?: DispersalDraftState; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Pass failed')
      if (json.draft) setState(json.draft)
      else await loadState()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Pass failed')
    } finally {
      setPickBusy(false)
    }
  }

  const removePass = async (rosterId: string) => {
    setPickBusy(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/pass`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rosterId, remove: true }),
        }
      )
      const json = (await res.json().catch(() => ({}))) as { draft?: DispersalDraftState; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      if (json.draft) setState(json.draft)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setPickBusy(false)
    }
  }

  const forceComplete = async () => {
    setPickBusy(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/complete`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? 'Failed')
      }
      await loadState()
      toast.success('Draft marked complete.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setPickBusy(false)
    }
  }

  const startDraft = async () => {
    setPickBusy(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/dispersal-draft/${encodeURIComponent(draftId)}/start`,
        { method: 'POST' }
      )
      const json = (await res.json().catch(() => ({}))) as DispersalDraftState & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Start failed')
      setState(json)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Start failed')
    } finally {
      setPickBusy(false)
    }
  }

  const isCommissioner = settings?.userRole === 'commissioner'

  if (!state) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-white/60">
        {pollError ? (
          <div className="mx-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-red-100">
            <p className="font-semibold">Could not load draft</p>
            <p className="mt-1 text-xs text-red-200/90">{pollError}</p>
            <p className="mt-2 text-[11px] text-white/45">Retrying every {POLL_MS / 1000}s…</p>
          </div>
        ) : (
          'Loading dispersal draft…'
        )}
      </main>
    )
  }

  if (state.status === 'completed' || state.status === 'cancelled') {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-white">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-emerald-100">✅ Dispersal draft complete</h1>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {state.picks.map((p) => (
                <tr key={p.pickNumber} className="border-b border-white/5">
                  <td className="px-3 py-2">{nameFor(p.rosterId)}</td>
                  <td className="px-3 py-2">{p.isPassed ? 'Passed' : (p.assetDisplayName ?? '—')}</td>
                  <td className="px-3 py-2">{p.isPassed ? '—' : (p.assetType ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 rounded-xl border border-white/10 bg-[#0a1328] p-4 text-xs text-white/70">
          <p>🟢 Unclaimed players → waiver wire</p>
          <p>🔴 Unclaimed FAAB → forfeited</p>
          <p>🟡 Unclaimed picks → FAAB bid auction (non-participants only)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/league/${leagueId}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/85 hover:bg-white/5"
          >
            Back to league
          </Link>
        </div>
      </main>
    )
  }

  const configuring = state.status === 'configuring' || state.status === 'pending'

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white">
      {pollError ? (
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          Refresh issue: {pollError} — still retrying every {POLL_MS / 1000}s
        </div>
      ) : null}
      {configuring ? (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p>This draft is not live yet.</p>
          {isCommissioner ? (
            <button
              type="button"
              disabled={pickBusy}
              onClick={() => void startDraft()}
              className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-100"
            >
              Start dispersal draft
            </button>
          ) : (
            <p className="mt-2 text-xs text-white/55">Waiting for the commissioner to start.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
            {(['all', 'player', 'draft_pick', 'faab'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-full px-2 py-1 ${tab === k ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/5 text-white/55'}`}
              >
                {k === 'all'
                  ? 'All'
                  : k === 'player'
                    ? `Players (${pool.filter((a) => a.isAvailable && a.assetType === 'player').length})`
                    : k === 'draft_pick'
                      ? `Picks (${pool.filter((a) => a.isAvailable && a.assetType === 'draft_pick').length})`
                      : `FAAB (${pool.filter((a) => a.isAvailable && a.assetType === 'faab').length})`}
              </button>
            ))}
          </div>
          <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-2 text-[11px]"
              >
                <div className="min-w-0">
                  {a.assetType === 'player' ? (
                    <p className="truncate text-white/90">
                      {a.playerName}{' '}
                      <span className="text-white/45">
                        {a.playerPosition} {a.playerTeam}
                      </span>
                    </p>
                  ) : a.assetType === 'draft_pick' ? (
                    <div>
                      <p>
                        {a.pickYear} Round {a.pickRound}
                        {a.isTradedPick ? (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 text-[9px] text-amber-200">TRADED</span>
                        ) : null}
                      </p>
                      {a.isTradedPick && a.originalOwnerRosterId ? (
                        <p className="mt-0.5 text-[9px] text-white/40">
                          Original owner roster preserved in DB — pick routes to winner on claim.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p>
                      ${a.faabAmount ?? 0}{' '}
                      <span className="text-amber-200/80">⚠️ Lost if unclaimed</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!isMyTurn || isPassed || pickBusy || state.status !== 'in_progress'}
                  onClick={() => void submitPick(a.id)}
                  className="shrink-0 rounded border border-cyan-400/35 px-2 py-1 text-[10px] font-bold text-cyan-100 disabled:opacity-30"
                >
                  Pick →
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-[#081226] p-4 text-center lg:col-span-1">
          <p className="text-[11px] text-white/45">
            Round {roundNo} of {state.totalRounds}
          </p>
          <p className="text-[11px] text-white/45">
            Pick {pickInRoundNo} of {state.picksPerRound} this round · #{state.currentPickNumber} overall
          </p>
          <p
            className={`mt-4 text-lg font-bold ${isMyTurn ? 'text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]' : 'text-white/90'}`}
          >
            {currentRosterId ? nameFor(currentRosterId) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-white/40">is on the clock</p>
          {isMyTurn ? <p className="mt-2 text-sm font-bold text-cyan-300">YOUR PICK</p> : null}
          {pickTimeSeconds > 0 && state.status === 'in_progress' ? (
            <p className={`mt-3 text-2xl font-mono ${secondsLeft <= 10 ? 'text-red-400' : 'text-white/80'}`}>
              {secondsLeft}s
            </p>
          ) : null}
          <div className="mt-4 space-y-2">
            {!isPassed ? (
              <button
                type="button"
                disabled={pickBusy || state.status !== 'in_progress'}
                onClick={() => void submitPass()}
                className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
              >
                PASS
              </button>
            ) : (
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/60">PASSED</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <p className="mb-2 text-[11px] font-semibold text-white/55">Draft order</p>
          <ul className="space-y-2 text-xs">
            {participants.map((rid) => {
              const passed = state.passedRosterIds.includes(rid)
              const turns = state.draftOrder.filter((x) => x === rid).length
              const taken = state.picks.filter((p) => p.rosterId === rid && !p.isPassed).length
              return (
                <li
                  key={rid}
                  className={`flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-2 py-2 ${
                    rid === currentRosterId ? 'border-cyan-400/30 bg-cyan-500/10' : ''
                  }`}
                >
                  <span className="truncate">{nameFor(rid)}</span>
                  <span className="flex flex-col items-end gap-1 text-[10px] text-white/45">
                    {passed ? <span className="text-amber-200/80">✓ Passed</span> : null}
                    <span>
                      Picks: {taken}/{turns}
                    </span>
                    {isCommissioner && passed ? (
                      <button
                        type="button"
                        onClick={() => void removePass(rid)}
                        className="text-cyan-300/90 hover:underline"
                      >
                        Remove pass
                      </button>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {isCommissioner && state.status === 'in_progress' ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={pickBusy}
            onClick={() => void forceComplete()}
            className="rounded-lg border border-amber-500/30 px-4 py-2 text-xs text-amber-100"
          >
            Force complete (commissioner)
          </button>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#080f1f] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Draft log</p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-[11px] text-white/75">
          {state.picks.length === 0 ? (
            <p className="text-white/40">No picks yet.</p>
          ) : (
            state.picks.map((p) => (
              <p key={p.pickNumber}>
                <span className="text-white/45">
                  Round {p.round}, Pick {p.pickInRound}:
                </span>{' '}
                <span className="text-white/85">{nameFor(p.rosterId)}</span>{' '}
                {p.isPassed ? (
                  <span className="text-amber-200/90">passed</span>
                ) : (
                  <span>selected {p.assetDisplayName ?? 'asset'}</span>
                )}
              </p>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
