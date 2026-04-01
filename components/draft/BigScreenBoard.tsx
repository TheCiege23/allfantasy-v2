'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DraftState, Pick } from '@/lib/workers/draft-worker'
import { DraftGrid } from './DraftGrid'
import { PickTimer } from './PickTimer'
import { PickAnnouncement } from './PickAnnouncement'

function isDraftState(value: unknown): value is DraftState {
  return Boolean(value && typeof value === 'object' && 'draftId' in (value as Record<string, unknown>))
}

export function BigScreenBoard({ draftId }: { draftId: string }) {
  const [state, setState] = useState<DraftState | null>(null)
  const [lastPick, setLastPick] = useState<Pick | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/draft/${encodeURIComponent(draftId)}/state`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!cancelled && res.ok && data?.state) {
        setState(data.state)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftId])

  useEffect(() => {
    const stream = new EventSource(`/api/draft/${encodeURIComponent(draftId)}/stream`)

    const handleDraftState = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data)
        if (isDraftState(next)) {
          setState(next)
        }
      } catch {
        // ignore malformed stream packets
      }
    }

    const handlePick = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as { pick?: Pick }
        if (next.pick) setLastPick(next.pick)
      } catch {
        // ignore malformed stream packets
      }
    }

    stream.addEventListener('draft_state', handleDraftState as EventListener)
    stream.addEventListener('pick_made', handlePick as EventListener)
    stream.onerror = () => {
      // browser retries automatically
    }
    return () => stream.close()
  }, [draftId])

  const heading = useMemo(() => {
    if (!state) return 'Draft Board'
    return `${state.leagueName} • Round ${state.currentRound} Pick ${state.currentPickNumber}`
  }, [state])

  if (!state) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/60">
        Loading draft board...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040915] px-6 py-6">
      <PickAnnouncement pick={lastPick} />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">Big Screen Mode</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{heading}</h1>
        </div>
        <PickTimer seconds={state.timerRemainingSeconds} active={state.timerActive} />
      </div>
      <DraftGrid state={state} bigScreen />
    </div>
  )
}
