'use client'

import { useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import type { DraftPickRecord } from '@/app/draft/types'
import { simulateDraft, simulateNextPicks } from '@/lib/ai/sim/aiSimulationEngine'
import type { SimPlayerInput } from '@/lib/ai/sim/types'
import { cn } from '@/lib/utils'

function pickToSim(p: DraftPickRecord, idx: number): SimPlayerInput {
  const base = 8 + (p.round ?? 1) * 0.4
  return {
    id: p.playerId ?? `pick-${p.overallPick}`,
    name: p.playerName ?? undefined,
    position: p.position ?? 'FLEX',
    projection: Math.min(28, base + (idx % 5) * 0.3),
    variance: 6 + (idx % 3),
    consistency: 0.45,
  }
}

export function DraftSimulationQuickBar({
  myPicks,
  numTeams,
  queuePreview,
  className,
}: {
  myPicks: DraftPickRecord[]
  numTeams: number
  /** Optional: next players in queue as hypothetical picks */
  queuePreview?: Array<{ id: string; name: string; position: string }>
  className?: string
}) {
  const [busy, setBusy] = useState<'pick' | 'three' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const roster = useMemo(() => myPicks.filter((x) => x.playerId).map((p, i) => pickToSim(p, i)), [myPicks])

  const runThisPick = (hypo: SimPlayerInput) => {
    setBusy('pick')
    setMsg(null)
    try {
      const r = simulateDraft({
        userRoster: roster,
        hypotheticalPick: hypo,
        numTeams,
        iterations: 180,
      })
      setMsg(
        `Δ strength ${r.strengthDelta.toFixed(2)} · playoff odds impact ~${(r.winOddsImpact * 100).toFixed(1)} pts (heuristic) · balance ${r.positionalBalanceWithPick.toFixed(0)}`,
      )
    } finally {
      setBusy(null)
    }
  }

  const runNextThree = () => {
    if (!queuePreview?.length) {
      setMsg('Queue players in the player pool to simulate next picks.')
      return
    }
    setBusy('three')
    setMsg(null)
    try {
      const picks: SimPlayerInput[] = queuePreview.slice(0, 3).map((q, i) => ({
        id: q.id,
        name: q.name,
        position: q.position || 'FLEX',
        projection: 10 + i * 0.5,
        variance: 7,
      }))
      const r = simulateNextPicks({ userRoster: roster, picks, numTeams })
      setMsg(
        r.perPick.length
          ? `Next ${r.perPick.length} pick(s): last Δ strength ${r.perPick[r.perPick.length - 1]!.strengthDelta.toFixed(2)}`
          : 'No picks to simulate.',
      )
    } finally {
      setBusy(null)
    }
  }

  const hypoFromQueue = queuePreview?.[0]
    ? ({
        id: queuePreview[0].id,
        name: queuePreview[0].name,
        position: queuePreview[0].position || 'FLEX',
        projection: 11,
        variance: 7,
      } satisfies SimPlayerInput)
    : null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#0a1220]/90 px-3 py-2 text-[11px]',
        className,
      )}
      data-testid="draft-sim-quick-bar"
    >
      <FlaskConical className="h-3.5 w-3.5 text-cyan-400/90" aria-hidden />
      <span className="font-semibold text-white/70">Sim</span>
      <button
        type="button"
        disabled={busy !== null || !hypoFromQueue}
        onClick={() => hypoFromQueue && runThisPick(hypoFromQueue)}
        className="rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-1 font-semibold text-cyan-100 disabled:opacity-40"
        title={hypoFromQueue ? `Hypothetical: ${hypoFromQueue.name}` : 'Queue a player to sim this pick'}
      >
        {busy === 'pick' ? '…' : 'Sim this pick'}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => runNextThree()}
        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-semibold text-white/75"
      >
        {busy === 'three' ? '…' : 'Sim next 3 picks'}
      </button>
      {msg ? <span className="text-white/55">{msg}</span> : null}
    </div>
  )
}
