'use client'

import LeagueDiscoverySuggest from '@/components/league-discovery/LeagueDiscoverySuggest'

export default function DiscoverPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-white">Find your league</h1>
      <LeagueDiscoverySuggest />
    </main>
  )
}
