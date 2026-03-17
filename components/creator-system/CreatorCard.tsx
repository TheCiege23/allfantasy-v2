'use client'

import Link from 'next/link'
import { Users, Trophy, Share2 } from 'lucide-react'
import { VerifiedCreatorBadge } from '@/components/creator/VerifiedCreatorBadge'
import type { CreatorProfileDto } from '@/lib/creator-system/types'

export interface CreatorCardProps {
  creator: CreatorProfileDto
  onFollow?: (creatorId: string) => void
  onShare?: (creatorId: string, url: string) => void
  isFollowing?: boolean
  followLoading?: boolean
  showJoinLeague?: boolean
  leagueHref?: string
}

export function CreatorCard({
  creator,
  onFollow,
  onShare,
  isFollowing,
  followLoading,
  showJoinLeague,
  leagueHref,
}: CreatorCardProps) {
  const profileHref = `/creators/${encodeURIComponent(creator.slug)}`
  const displayName = creator.displayName || creator.handle

  const handleShare = () => {
    if (onShare) {
      const url = typeof window !== 'undefined' ? `${window.location.origin}${profileHref}` : profileHref
      onShare(creator.id, url)
    } else {
      const url = typeof window !== 'undefined' ? `${window.location.origin}${profileHref}` : profileHref
      navigator.clipboard?.writeText(url).catch(() => {})
    }
  }

  return (
    <article
      className="rounded-2xl border p-4 sm:p-5 transition hover:opacity-95"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 60%, transparent)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href={profileHref} className="flex items-center gap-3 shrink-0">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: 'var(--panel2)' }}
          >
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold" style={{ color: 'var(--muted)' }}>
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 sm:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                {displayName}
              </span>
              {creator.isVerified && (
                <VerifiedCreatorBadge handle={creator.handle} showLabel={false} linkToProfile={false} size="sm" />
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              @{creator.handle}
            </p>
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:block">
            <Link href={profileHref} className="inline-flex items-center gap-2 flex-wrap hover:opacity-90">
              <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                {displayName}
              </span>
              {creator.isVerified && (
                <VerifiedCreatorBadge handle={creator.handle} showLabel={false} linkToProfile={false} size="sm" />
              )}
            </Link>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              @{creator.handle}
            </p>
          </div>
          {creator.bio && (
            <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>
              {creator.bio}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {(creator.leagueCount ?? 0)} league{(creator.leagueCount ?? 0) !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {(creator.followerCount ?? 0)} followers
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href={profileHref}
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          View profile
        </Link>
        {onFollow && (
          <button
            type="button"
            disabled={followLoading}
            onClick={() => onFollow(creator.id)}
            className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
            style={{
              background: isFollowing ? 'var(--panel2)' : 'var(--accent)',
              color: isFollowing ? 'var(--muted)' : 'var(--bg)',
              border: '1px solid var(--border)',
            }}
          >
            {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        {showJoinLeague && leagueHref && (
          <Link
            href={leagueHref}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Join league
          </Link>
        )}
        <button
          type="button"
          onClick={handleShare}
          className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </article>
  )
}
