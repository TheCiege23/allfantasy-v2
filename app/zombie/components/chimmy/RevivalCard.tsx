'use client'

import { useZombieDmCommand } from '@/app/zombie/components/chimmy/useZombieDmCommand'

export function RevivalCard({
  leagueId,
  serumCount,
  reviveThreshold,
}: {
  leagueId: string
  serumCount: number
  reviveThreshold: number
}) {
  const { isSending, feedback, sendCommand } = useZombieDmCommand(leagueId)
  if (serumCount < reviveThreshold) return null

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
      <p className="text-[13px] font-bold text-amber-100">⚡ You have enough serums to revive</p>
      <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">
        {reviveThreshold} required — you hold {serumCount}. You become a Revived Survivor; you can be re-infected.
      </p>
      <button
        type="button"
        onClick={() => void sendCommand('@Chimmy revive')}
        disabled={isSending}
        className="mt-3 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-amber-500/35 text-[14px] font-bold text-amber-50 hover:bg-amber-500/45 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSending ? 'Sending…' : '⚡ Revive Me'}
      </button>
      {feedback ? (
        <p className={feedback.kind === 'success' ? 'mt-2 text-[12px] text-emerald-200/90' : 'mt-2 text-[12px] text-red-200/90'}>
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
