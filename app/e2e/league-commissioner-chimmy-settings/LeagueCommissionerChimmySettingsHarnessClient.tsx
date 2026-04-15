'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { LeagueSettingsTab } from '@/app/league/[leagueId]/tabs/LeagueSettingsTab'

export function LeagueCommissionerChimmySettingsHarnessClient() {
  const searchParams = useSearchParams()
  const leagueId = searchParams?.get('leagueId') ?? 'e2e-league-chimmy'

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-lg font-semibold">League commissioner Chimmy settings harness</h1>
        <LeagueSettingsTab leagueId={leagueId} isCommissioner isHeadCommissioner />
      </div>
    </main>
  )
}