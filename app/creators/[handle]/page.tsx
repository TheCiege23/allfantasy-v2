'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CreatorProfileHeader,
  CreatorLeagueCard,
  CreatorStatsPanel,
  CreatorBrandingEditor,
  CreatorCommunityPreview,
} from '@/components/creator-system'
import type { CreatorProfileDto } from '@/lib/creator-system/types'
import type { CreatorLeagueDto } from '@/lib/creator-system/types'

export default function CreatorProfilePage() {
  const params = useParams()
  const creatorSlugOrHandle = (params?.handle as string) || ''

  const [creator, setCreator] = useState<CreatorProfileDto | null>(null)
  const [leagues, setLeagues] = useState<CreatorLeagueDto[]>([])
  const [analytics, setAnalytics] = useState<{ profileViews: number; followCount: number; leagueJoins: number; inviteShares: number; period: string } | null>(null)
  const [tab, setTab] = useState<'leagues' | 'analytics' | 'branding'>('leagues')
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  const fetchCreator = useCallback(() => {
    if (!creatorSlugOrHandle) return
    setLoading(true)
    fetch(`/api/creators/${encodeURIComponent(creatorSlugOrHandle)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setCreator(data)
      })
      .catch(() => setCreator(null))
      .finally(() => setLoading(false))
  }, [creatorSlugOrHandle])

  const fetchLeagues = useCallback(() => {
    if (!creatorSlugOrHandle) return
    fetch(`/api/creators/${encodeURIComponent(creatorSlugOrHandle)}/leagues`)
      .then((res) => res.ok ? res.json() : [])
      .then(setLeagues)
      .catch(() => setLeagues([]))
  }, [creatorSlugOrHandle])

  const fetchAnalytics = useCallback(() => {
    if (!creatorSlugOrHandle) return
    fetch(`/api/creators/${encodeURIComponent(creatorSlugOrHandle)}/analytics?period=30`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
  }, [creatorSlugOrHandle])

  useEffect(() => {
    fetchCreator()
  }, [fetchCreator])

  useEffect(() => {
    if (creator) {
      fetchLeagues()
      setIsOwner(!!(creator as { isOwner?: boolean })?.isOwner)
    }
  }, [creator, fetchLeagues])

  useEffect(() => {
    if (tab === 'analytics' && creator) fetchAnalytics()
  }, [tab, creator, fetchAnalytics])

  const handleFollow = useCallback(() => {
    if (!creator) return
    setFollowLoading(true)
    fetch(`/api/creators/${encodeURIComponent(creator.slug)}/follow`, { method: 'POST' })
      .then((res) => {
        if (res.ok) fetchCreator()
      })
      .finally(() => setFollowLoading(false))
  }, [creator, fetchCreator])

  const handleUnfollow = useCallback(() => {
    if (!creator) return
    setFollowLoading(true)
    fetch(`/api/creators/${encodeURIComponent(creator.slug)}/unfollow`, { method: 'POST' })
      .then((res) => {
        if (res.ok) fetchCreator()
      })
      .finally(() => setFollowLoading(false))
  }, [creator, fetchCreator])

  const handleShare = useCallback((url: string) => {
    if (!creator) return
    fetch(`/api/creators/${encodeURIComponent(creator.slug)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {})
    navigator.clipboard?.writeText(url).catch(() => {})
  }, [creator])

  if (loading && !creator) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Creator not found
          </p>
          <Link href="/creators" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            ← All creators
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/creators" className="text-sm font-medium mb-6 inline-block" style={{ color: 'var(--muted)' }}>
          ← All creators
        </Link>

        <CreatorProfileHeader
          creator={creator}
          isOwner={isOwner}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onShare={handleShare}
          isFollowing={creator.isFollowing}
          followLoading={followLoading}
        />

        {isOwner && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setTab('leagues')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === 'leagues' ? 'opacity-100' : 'opacity-60'}`}
              style={{
                background: tab === 'leagues' ? 'var(--accent)' : 'var(--panel)',
                color: tab === 'leagues' ? 'var(--bg)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Leagues
            </button>
            <button
              type="button"
              onClick={() => setTab('analytics')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === 'analytics' ? 'opacity-100' : 'opacity-60'}`}
              style={{
                background: tab === 'analytics' ? 'var(--accent)' : 'var(--panel)',
                color: tab === 'analytics' ? 'var(--bg)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setTab('branding')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === 'branding' ? 'opacity-100' : 'opacity-60'}`}
              style={{
                background: tab === 'branding' ? 'var(--accent)' : 'var(--panel)',
                color: tab === 'branding' ? 'var(--bg)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Branding
            </button>
          </div>
        )}

        {tab === 'leagues' && (
          <>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Leagues
            </h2>
            {leagues.length === 0 ? (
              <CreatorCommunityPreview leagues={[]} creatorSlug={creator.slug} />
            ) : (
              <ul className="space-y-4">
                {leagues.map((league) => (
                  <li key={league.id}>
                    <CreatorLeagueCard league={league} showJoinButton />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'analytics' && isOwner && (
          <CreatorStatsPanel
            followerCount={analytics?.followCount ?? creator.followerCount ?? 0}
            leagueCount={creator.leagueCount ?? 0}
            profileViews={analytics?.profileViews ?? 0}
            inviteShares={analytics?.inviteShares ?? 0}
            period={analytics?.period ?? '30d'}
          />
        )}

        {tab === 'branding' && isOwner && (
          <CreatorBrandingEditor
            initialBranding={creator.branding}
            creatorIdOrSlug={creator.slug}
            onSaved={() => fetchCreator()}
          />
        )}
      </div>
    </div>
  )
}
