'use client'

import Link from 'next/link'
import { LeagueStoryCard } from './LeagueStoryCard'
import type { LeagueStoryPayload } from '@/lib/league-story-engine/types'

export interface LeagueStoryPageContentProps {
  payload: LeagueStoryPayload
}

export function LeagueStoryPageContent({ payload }: LeagueStoryPageContentProps) {
  return (
    <main className="min-h-screen bg-[#0f0f14] px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <LeagueStoryCard payload={payload} captureId="league-story-page-card" />
        <p className="text-center text-sm text-white/50">
          League story from AllFantasy — narratives around your league.
        </p>
        <div className="flex justify-center">
          <Link
            href="/app"
            className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Try AllFantasy
          </Link>
        </div>
      </div>
    </main>
  )
}
