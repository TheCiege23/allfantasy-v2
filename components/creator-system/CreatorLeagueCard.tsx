'use client'

import Link from 'next/link'
import { Users, Share2 } from 'lucide-react'
import type { CreatorLeagueDto } from '@/lib/creator-system/types'

export interface CreatorLeagueCardProps {
  league: CreatorLeagueDto
  onShare?: (leagueId: string, url: string) => void
  showJoinButton?: boolean
}

export function CreatorLeagueCard({ league, onShare, showJoinButton = true }: CreatorLeagueCardProps) {
  const leagueHref = `/creator/leagues/${encodeURIComponent(league.id)}`
  const joinHref = league.inviteUrl || `${leagueHref}?join=${encodeURIComponent(league.inviteCode)}`

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${joinHref}` : joinHref
    if (onShare) onShare(league.id, url)
    else navigator.clipboard?.writeText(url).catch(() => {})
  }

  return (
    <div
      className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>
          {league.name}
        </h3>
        {league.description && (
          <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>
            {league.description}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          {league.sport} · {league.type}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {league.memberCount}
            {league.maxMembers > 0 ? ` / ${league.maxMembers}` : ''} members
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={leagueHref}
          data-testid={`creator-league-view-${league.id}`}
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          View
        </Link>
        {showJoinButton && !league.isMember && (
          <Link
            href={joinHref}
            data-testid={`creator-league-join-${league.id}`}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Join league
          </Link>
        )}
        {league.isMember && (
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Joined
          </span>
        )}
        <button
          type="button"
          onClick={handleShare}
          data-testid={`creator-league-share-${league.id}`}
          className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share invite
        </button>
      </div>
    </div>
  )
}
