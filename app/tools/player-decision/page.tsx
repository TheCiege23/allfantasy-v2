import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PlayerDecisionTool } from '@/components/ai-player-comparison/PlayerDecisionTool'

export const metadata = {
  title: 'Start A vs B — Player decision | AllFantasy',
  description: 'Compare two players for a weekly lineup decision with deterministic projections and scenario modes.',
}

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#040915] text-white/50">
      Loading…
    </div>
  )
}

export default function PlayerDecisionPage() {
  return (
    <div className="min-h-screen bg-[#040915] text-white">
      <div className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white/90"
            data-testid="player-decision-back"
          >
            <ChevronLeft className="h-4 w-4" />
            App home
          </Link>
        </div>
      </div>
      <Suspense fallback={<Fallback />}>
        <PlayerDecisionTool />
      </Suspense>
    </div>
  )
}
