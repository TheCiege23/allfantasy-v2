'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildEnrichedPlayer, resolveHeadshotCandidates } from '@/lib/players/buildPlayerMap'

type PlayerImageProps = {
  sleeperId: string
  sport?: string
  name?: string
  position?: string
  /** Rolling Insights or other primary headshot */
  headshotUrl?: string | null
  espnId?: string
  riId?: string
  size?: number
  className?: string
  /** rounded-full for roster rows; rounded-[8px] for card-style */
  variant?: 'round' | 'card'
}

function positionBgClass(position: string | undefined): string {
  const p = (position || '').toUpperCase()
  if (p === 'QB') return 'bg-red-500/80'
  if (p === 'RB') return 'bg-green-500/80'
  if (p === 'WR') return 'bg-blue-500/80'
  if (p === 'TE') return 'bg-orange-500/80'
  if (p === 'K') return 'bg-gray-500/80'
  if (p === 'DEF' || p === 'DST') return 'bg-purple-500/80'
  if (['SP', 'F', 'G', 'C', 'PF', 'PG', 'SG', 'SF'].includes(p)) return 'bg-indigo-500/80'
  return 'bg-slate-500/80'
}

function initialsFromName(name: string | undefined, position: string | undefined): string {
  const n = name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  const pos = position?.trim()
  if (pos) return pos.slice(0, 2).toUpperCase()
  return '?'
}

export function PlayerImage({
  sleeperId,
  sport = 'NFL',
  name,
  position,
  headshotUrl,
  espnId,
  riId,
  size = 32,
  className = '',
  variant = 'round',
}: PlayerImageProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0)

  const urls = useMemo(() => {
    const enriched = buildEnrichedPlayer({
      sleeper_id: sleeperId,
      full_name: name ?? '',
      position: position ?? '',
      team: '',
      sport,
      espn_id: espnId,
      ri_id: riId,
      headshot_url: headshotUrl ?? undefined,
    })
    return resolveHeadshotCandidates(enriched)
  }, [sleeperId, sport, name, position, headshotUrl, espnId, riId])

  useEffect(() => {
    setFallbackIndex(0)
  }, [sleeperId, sport, espnId, riId, headshotUrl])

  const currentUrl = urls[fallbackIndex] ?? ''
  const exhausted = urls.length === 0 || fallbackIndex >= urls.length
  const radius = variant === 'card' ? 'rounded-[8px]' : 'rounded-full'

  if (exhausted || !currentUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center border border-white/[0.12] text-[10px] font-bold text-white ${positionBgClass(position)} ${radius} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initialsFromName(name, position)}
      </div>
    )
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/[0.12] ${radius} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={currentUrl}
        alt={name || 'Player'}
        className="h-full w-full object-cover"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
        onError={() => setFallbackIndex((i) => i + 1)}
      />
    </div>
  )
}
