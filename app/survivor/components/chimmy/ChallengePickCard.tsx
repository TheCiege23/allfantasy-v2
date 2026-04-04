'use client'

import { useState } from 'react'

export function ChallengePickCard({
  title,
  instructions,
  children,
  onLock,
}: {
  title: string
  instructions: string
  children: React.ReactNode
  onLock?: (payload: string) => void
}) {
  const [v, setV] = useState('')
  return (
    <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-orange-200">⚡ Private submission</p>
      <p className="mt-1 text-[15px] font-semibold text-white">{title}</p>
      <p className="mt-2 text-[12px] text-white/65">{instructions}</p>
      <div className="mt-3">{children}</div>
      <input
        className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Your pick"
        aria-label="Challenge pick"
      />
      <button
        type="button"
        className="mt-3 w-full min-h-[48px] rounded-lg bg-sky-600/80 text-[13px] font-semibold text-white"
        onClick={() => onLock?.(v)}
      >
        Lock in pick
      </button>
    </div>
  )
}
