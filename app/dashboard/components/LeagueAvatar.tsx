'use client'

import { useState } from 'react'
import type { UserLeague } from '../types'
import { LeagueTypeIcon } from './LeagueTypeIcon'

function sleeperAvatarSrc(avatarUrl: string | null | undefined): string | null {
  const u = avatarUrl?.trim()
  if (!u) return null
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')) return u
  return `https://sleepercdn.com/avatars/${u}`
}

export function LeagueAvatar({ league, size = 32 }: { league: UserLeague; size?: number }) {
  const sleeperUrl = sleeperAvatarSrc(league.avatarUrl ?? null)
  const [imgError, setImgError] = useState(false)

  if (sleeperUrl && !imgError) {
    return (
      <img
        src={sleeperUrl}
        alt={league.name}
        className="flex-shrink-0 rounded-[8px] object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    )
  }

  return <LeagueTypeIcon league={league} size={size} />
}
