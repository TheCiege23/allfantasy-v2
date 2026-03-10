'use client'

import AIGMStatusIndicator from '@/app/components/AIGMStatusIndicator'

export default function LegacyTradeTabHeader({
  username,
  leagueId,
}: {
  username?: string
  leagueId?: string
}) {
  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60">Know if a trade helps or hurts your team before you accept.</p>
      {leagueId && username && (
        <AIGMStatusIndicator
          username={username}
          leagueId={leagueId}
          onReady={() => {}}
        />
      )}
    </>
  )
}
