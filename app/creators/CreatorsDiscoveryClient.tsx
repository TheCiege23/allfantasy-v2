'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { CreatorCard } from '@/components/creator-system'
import type { CreatorProfileDto } from '@/lib/creator-system/types'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

const SPORTS = SUPPORTED_SPORTS

export default function CreatorsDiscoveryClient() {
  const [creators, setCreators] = useState<CreatorProfileDto[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<string>('')
  const [followLoading, setFollowLoading] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const fetchCreators = useCallback(() => {
    setLoading(true)
    const query = new URLSearchParams()
    query.set('limit', '24')
    if (sport) query.set('sport', sport)

    fetch(`/api/creators?${query.toString()}`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.creators)) setCreators(payload.creators)
        else setCreators([])
      })
      .catch(() => setCreators([]))
      .finally(() => setLoading(false))
  }, [sport])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const toggleFollow = async (creator: CreatorProfileDto, shouldFollow: boolean) => {
    setFollowLoading(creator.id)
    setStatus(null)
    try {
      const response = await fetch(
        `/api/creators/${encodeURIComponent(creator.slug)}/${shouldFollow ? 'follow' : 'unfollow'}`,
        { method: 'POST' }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setStatus(payload.error || 'Unable to update follow state')
        return
      }

      setCreators((current) =>
        current.map((entry) =>
          entry.id === creator.id
            ? {
                ...entry,
                isFollowing: shouldFollow,
                followerCount: Math.max(0, (entry.followerCount ?? 0) + (shouldFollow ? 1 : -1)),
              }
            : entry
        )
      )
      setStatus(shouldFollow ? `Following ${creator.displayName || creator.handle}` : `Unfollowed ${creator.displayName || creator.handle}`)
    } catch {
      setStatus('Network error while updating follow state')
    } finally {
      setFollowLoading(null)
    }
  }

  const handleShare = useCallback(async (creator: CreatorProfileDto, url: string) => {
    try {
      const response = await fetch(`/api/creators/${encodeURIComponent(creator.slug)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'discovery_card', channel: 'direct' }),
      })
      const payload = await response.json().catch(() => ({}))
      await navigator.clipboard?.writeText(payload.url || url)
      setStatus(`Share link copied for ${creator.displayName || creator.handle}`)
    } catch {
      setStatus('Unable to copy creator share link')
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div
        className="rounded-[28px] border p-12 text-center"
        style={{
          borderColor: 'var(--border)',
          background: 'color-mix(in srgb, var(--panel) 72%, transparent)',
        }}
      >
        <Sparkles className="mx-auto h-12 w-12" style={{ color: 'var(--muted)' }} />
        <p className="mt-3 font-medium" style={{ color: 'var(--text)' }}>
          No creators matched this filter
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Try a different sport filter or come back after more creators launch leagues.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSport('')}
          data-testid="creator-sport-filter-all"
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: !sport ? 'var(--accent)' : 'var(--panel)',
            color: !sport ? 'var(--bg)' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          All sports
        </button>
        {SPORTS.map((sportOption) => (
          <button
            key={sportOption}
            type="button"
            onClick={() => setSport(sportOption)}
            data-testid={`creator-sport-filter-${sportOption}`}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: sport === sportOption ? 'var(--accent)' : 'var(--panel)',
              color: sport === sportOption ? 'var(--bg)' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            {sportOption}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {creators.map((creator) => (
          <CreatorCard
            key={creator.id}
            creator={creator}
            onFollow={(entry) => toggleFollow(entry, true)}
            onUnfollow={(entry) => toggleFollow(entry, false)}
            onShare={handleShare}
            isFollowing={creator.isFollowing}
            followLoading={followLoading === creator.id}
          />
        ))}
      </div>

      {status && (
        <p className="text-sm" style={{ color: status.includes('error') ? 'var(--destructive)' : 'var(--muted)' }}>
          {status}
        </p>
      )}
    </div>
  )
}
