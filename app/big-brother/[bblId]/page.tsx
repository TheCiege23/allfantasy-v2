'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BBChimmyCard } from '@/app/big-brother/components/BBChimmyCard'

/**
 * Big Brother dedicated @Chimmy surface (bblId = main app league id).
 */
export default function BigBrotherChimmyPage() {
  const { bblId } = useParams<{ bblId: string }>()
  if (!bblId) return null

  return (
    <div className="min-h-screen bg-[#040915] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <Link href={`/league/${bblId}`} className="text-[13px] text-cyan-400 hover:underline" data-testid="bb-chimmy-back">
          ← Back to league
        </Link>
        <header className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Big Brother · @Chimmy</h1>
          <p className="text-[13px] text-white/50">
            Private action cards and commands. Eviction votes stay in the Vote Center or private chat.
          </p>
        </header>
        <BBChimmyCard leagueId={bblId} />
      </div>
    </div>
  )
}
