'use client'

import LegacyLeagueIdeaForm from '@/app/components/LegacyLeagueIdeaForm'

export default function LegacyIdeasTab() {
  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60 mb-4">
        Got a creative league format? Submit it here - accepted ideas get built into AllFantasy with full credit.
      </p>
      <LegacyLeagueIdeaForm />
    </>
  )
}
