'use client'

import { useState } from 'react'
import { CommissionerDraftControls } from '@/components/draft/live/CommissionerDraftControls'

export function DraftApiControlsHarnessClient({ leagueId }: { leagueId: string }) {
  const [lastAction, setLastAction] = useState<string>('')

  return (
    <main className="min-h-screen bg-[#040915] p-6 text-white">
      <h1 className="text-lg font-semibold">E2E draft API controls</h1>
      <p className="mt-2 text-sm text-white/55">Exercises POST /api/leagues/…/draft/actions via live commissioner controls.</p>
      <div className="mt-6 max-w-md">
        <CommissionerDraftControls
          leagueId={leagueId}
          onSessionUpdated={() => setLastAction('updated')}
        />
      </div>
      <p className="mt-4 text-sm text-white/45" data-testid="draft-api-controls-callback">
        {lastAction || '—'}
      </p>
    </main>
  )
}
