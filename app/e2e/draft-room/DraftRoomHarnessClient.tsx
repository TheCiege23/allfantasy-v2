'use client'

import { useState } from 'react'
import { DraftRoomPageClient } from '@/components/app/draft-room/DraftRoomPageClient'

type DraftRoomHarnessClientProps = {
  leagueId: string
  sport: string
  formatType?: string
  isCommissioner?: boolean
}

export function DraftRoomHarnessClient({
  leagueId,
  sport,
  formatType,
  isCommissioner = true,
}: DraftRoomHarnessClientProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] p-6 text-white space-y-4">
        <h1 className="text-xl font-semibold">E2E Draft Room Harness</h1>
        <p className="text-sm text-white/60">Open the draft room shell to validate board, queue, AI helper, and war room interactions.</p>
        <button
          type="button"
          data-testid="draft-enter-room-button"
          onClick={() => setOpen(true)}
          className="rounded border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30"
        >
          Enter draft room
        </button>
      </main>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 bg-black/40 px-4 py-2">
        <button
          type="button"
          data-testid="draft-harness-back-button"
          onClick={() => setOpen(false)}
          className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          Back
        </button>
      </div>
      <DraftRoomPageClient
        leagueId={leagueId}
        leagueName="E2E Draft Room"
        sport={sport}
        isDynasty={false}
        isCommissioner={isCommissioner}
        formatType={formatType}
      />
    </div>
  )
}
