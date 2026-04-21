'use client'

import { useZombieDmCommand } from '@/app/zombie/components/chimmy/useZombieDmCommand'

export function BashingDecisionCard({
  leagueId,
  loserName,
  margin,
  hoursLeft,
}: {
  leagueId: string
  loserName: string
  margin: number
  hoursLeft?: number
}) {
  const { isSending, feedback, sendCommand } = useZombieDmCommand(leagueId)

  return (
    <div className="rounded-xl border-l-4 border-orange-500 bg-orange-500/10 p-4">
      <p className="text-[13px] font-bold text-orange-100">🔥 You bashed {loserName} by {margin.toFixed(1)} pts</p>
      <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">Spare or infect? If no choice by deadline, spare (league default).</p>
      {hoursLeft != null ? (
        <p className="mt-1 text-[11px] text-amber-200/90">Decide in ~{hoursLeft}h</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void sendCommand('@Chimmy bashing spare')}
          disabled={isSending}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-white/10 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          🤝 Spare
        </button>
        <button
          type="button"
          onClick={() => void sendCommand('@Chimmy bashing infect')}
          disabled={isSending}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-xl bg-orange-600/40 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          🧟 Infect
        </button>
      </div>
      {feedback ? (
        <p className={feedback.kind === 'success' ? 'mt-2 text-[12px] text-emerald-200/90' : 'mt-2 text-[12px] text-red-200/90'}>
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
