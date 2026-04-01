'use client'

import { useEffect, useState } from 'react'

type LotteryPreview = {
  eligible: Array<{
    rosterId: string
    displayName: string
    oddsPercent: number
    weight: number
    rank: number
  }>
  playoffTeamCount: number
}

type LotteryResult = {
  lotteryDraws: Array<{ pickSlot: number; rosterId: string; displayName: string }>
  slotOrder: Array<{ slot: number; rosterId: string; displayName: string }>
  seed: string
}

export function LotteryDraw({ draftId }: { draftId: string }) {
  const [preview, setPreview] = useState<LotteryPreview | null>(null)
  const [result, setResult] = useState<LotteryResult | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const res = await fetch(`/api/draft/${encodeURIComponent(draftId)}/state`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json().catch(() => null)
      if (cancelled || !data?.lotteryPreview) return
      setPreview(data.lotteryPreview)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [draftId])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#081121] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">Weighted lottery</p>
            <p className="mt-2 text-sm text-white/70">
              Draw the protected order, then launch the live board.
            </p>
          </div>
          <button
            type="button"
            disabled={running}
            onClick={async () => {
              setRunning(true)
              try {
                const res = await fetch(`/api/draft/${encodeURIComponent(draftId)}/lottery/run`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ finalize: false }),
                })
                const data = await res.json().catch(() => null)
                if (res.ok && data) {
                  setResult(data)
                }
              } finally {
                setRunning(false)
              }
            }}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100"
          >
            {running ? 'Running...' : 'Run Lottery'}
          </button>
        </div>
      </div>

      {preview?.eligible?.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#081121] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Odds</p>
          <div className="space-y-2">
            {preview.eligible.map((team) => (
              <div key={team.rosterId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">{team.displayName}</p>
                  <p className="text-xs text-white/45">Rank {team.rank}</p>
                </div>
                <p className="text-sm text-cyan-200">{team.oddsPercent.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-white/10 bg-[#081121] p-5">
          <p className="text-sm font-semibold text-white">Lottery Result</p>
          <p className="mt-1 text-xs text-white/45">Seed: {result.seed}</p>
          <div className="mt-4 space-y-2">
            {result.slotOrder.map((entry) => (
              <div key={`${entry.slot}-${entry.rosterId}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-sm font-semibold text-white">Pick {entry.slot}</p>
                <p className="text-sm text-cyan-100">{entry.displayName}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
