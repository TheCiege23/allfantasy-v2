'use client'

import Link from 'next/link'
import { Share2 } from 'lucide-react'
import { VerifiedCreatorBadge } from '@/components/creator/VerifiedCreatorBadge'
import type { CreatorProfileDto } from '@/lib/creator-system/types'

export interface CreatorProfileHeaderProps {
  creator: CreatorProfileDto
  isOwner?: boolean
  onFollow?: () => void
  onUnfollow?: () => void
  onShare?: (url: string) => void
  isFollowing?: boolean
  followLoading?: boolean
}

export function CreatorProfileHeader({
  creator,
  isOwner,
  onFollow,
  onUnfollow,
  onShare,
  isFollowing,
  followLoading,
}: CreatorProfileHeaderProps) {
  const displayName = creator.displayName || creator.handle
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/creators/${creator.slug}` : `/creators/${creator.slug}`

  const handleShare = () => {
    if (onShare) onShare(profileUrl)
    else navigator.clipboard?.writeText(profileUrl).catch(() => {})
  }

  return (
    <header
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 60%, transparent)' }}
    >
      {creator.bannerUrl && (
        <div className="h-24 sm:h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${creator.bannerUrl})` }} />
      )}
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden -mt-12 sm:-mt-16 border-4 border-[var(--panel)]"
          style={{ background: 'var(--panel2)' }}
        >
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold" style={{ color: 'var(--muted)' }}>
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>
              {displayName}
            </h1>
            {creator.isVerified && (
              <VerifiedCreatorBadge
                handle={creator.handle}
                badge={creator.verificationBadge}
                showLabel={true}
                linkToProfile={false}
                size="md"
              />
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            @{creator.handle}
          </p>
          {creator.bio && (
            <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
              {creator.bio}
            </p>
          )}
          {creator.websiteUrl && (
            <a
              href={creator.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm mt-1 inline-block truncate max-w-full"
              style={{ color: 'var(--accent)' }}
            >
              {creator.websiteUrl}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isOwner && onFollow && (
            <button
              type="button"
              disabled={followLoading}
              onClick={isFollowing ? onUnfollow : onFollow}
              data-testid="creator-profile-follow-button"
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{
                background: isFollowing ? 'var(--panel2)' : 'var(--accent)',
                color: isFollowing ? 'var(--muted)' : 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            data-testid="creator-profile-share-button"
            className="rounded-lg border px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Share2 className="h-4 w-4" />
            Share invite
          </button>
        </div>
      </div>
    </header>
  )
}
