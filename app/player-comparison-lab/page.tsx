'use client'

import { Suspense } from 'react'
import { PlayerComparisonPage } from '@/components/player-comparison-lab/PlayerComparisonPage'

export default function PlayerComparisonLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#07071a] px-4 text-sm text-white/60">
          Loading comparison lab…
        </div>
      }
    >
      <PlayerComparisonPage />
    </Suspense>
  )
}
