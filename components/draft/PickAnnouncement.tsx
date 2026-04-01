'use client'

import { useEffect, useState } from 'react'
import type { Pick } from '@/lib/workers/draft-worker'

export function PickAnnouncement({ pick }: { pick: Pick | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pick) return
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), 1400)
    return () => window.clearTimeout(id)
  }, [pick?.id])

  if (!pick || !visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#040915]/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#0b1326] p-8 text-center shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Round {pick.round} Pick {pick.overall}
        </p>
        <p className="mt-4 text-3xl font-semibold text-white">{pick.playerName}</p>
        <p className="mt-2 text-sm text-white/60">
          {pick.position}
          {pick.team ? ` • ${pick.team}` : ''}
        </p>
        <p className="mt-4 text-sm text-white/75">Selected by {pick.displayName ?? 'Manager'}</p>
      </div>
    </div>
  )
}
