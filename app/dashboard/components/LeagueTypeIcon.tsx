'use client'

import { getLeagueTypeMedia, resolveLeagueCardTypeKey } from '@/lib/league-media/leagueTypeMedia'
import type { UserLeague } from '../types'

export function LeagueTypeIcon({
  league,
  size = 32,
}: {
  league: Pick<
    UserLeague,
    'leagueType' | 'leagueVariant' | 'settings' | 'guillotineMode' | 'bestBallMode' | 'isDynasty'
  >
  size?: number
}) {
  const typeKey = resolveLeagueCardTypeKey({
    leagueType: league.leagueType,
    leagueVariant: league.leagueVariant,
    settings: league.settings,
    isDynasty: league.isDynasty,
    guillotineMode: league.guillotineMode,
    bestBallMode: league.bestBallMode,
  })
  const media = getLeagueTypeMedia(typeKey)
  const iconSrc = media.defaultLeagueImageUrl

  return (
    <img
      src={iconSrc}
      alt={media.label}
      width={size}
      height={size}
      className="flex-shrink-0 rounded-[8px] object-cover"
      style={{ width: size, height: size }}
    />
  )
}
