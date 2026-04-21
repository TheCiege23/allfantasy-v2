'use client'

import type { LeagueTeam } from '@prisma/client'
import type { UserLeague } from '@/app/dashboard/types'
import { AICoachingPage } from '@/components/ai/coaching/AICoachingPage'

/**
 * League AI Coaching workspace — premium franchise dashboard (see `AICoachingPage`).
 * Kept as a stable import for `AICoachingTab` / `LeagueShell`.
 */
export function AICoachingWorkspace({
  league,
  userTeam,
  sport,
}: {
  league: UserLeague
  userTeam: LeagueTeam | null
  sport: string
}) {
  return <AICoachingPage league={league} userTeam={userTeam} sport={sport} />
}
