'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  CreatorBrandingEditor,
  CreatorCommunityPreview,
  CreatorLeagueCard,
  CreatorProfileHeader,
  CreatorStatsPanel,
} from '@/components/creator-system'
import type {
  CreatorAnalyticsSummaryDto,
  CreatorLeagueDto,
  CreatorProfileDto,
} from '@/lib/creator-system/types'

type PageTab = 'community' | 'analytics' | 'branding'

export default function CreatorProfilePage() {
  const params = useParams()
  const creatorSlug = String(params?.handle || '')

  const [creator, setCreator] = useState<(CreatorProfileDto & { isOwner?: boolean }) | null>(null)
  const [leagues, setLeagues] = useState<CreatorLeagueDto[]>([])
  const [analytics, setAnalytics] = useState<CreatorAnalyticsSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [tab, setTab] = useState<PageTab>('community')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fetchCreator = useCallback(() => {
    if (!creatorSlug) return
    setLoading(true)
    fetch(`/api/creators/${encodeURIComponent(creatorSlug)}`)
      .then((response) => {
        if (!response.ok) throw new Error('not_found')
        return response.json()
      })
      .then((payload) => setCreator(payload))
      .catch(() => setCreator(null))
      .finally(() => setLoading(false))
  }, [creatorSlug])

  const fetchLeagues = useCallback(() => {
    if (!creatorSlug) return
    fetch(`/api/creators/${encodeURIComponent(creatorSlug)}/leagues`)
      .then((response) => (response.ok ? response.json() : []))
      .then((payload) => setLeagues(Array.isArray(payload) ? payload : []))
      .catch(() => setLeagues([]))
  }, [creatorSlug])

  const fetchAnalytics = useCallback(() => {
    if (!creatorSlug) return
    fetch(`/api/creators/${encodeURIComponent(creatorSlug)}/analytics?period=30`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setAnalytics(payload))
      .catch(() => setAnalytics(null))
  }, [creatorSlug])

  useEffect(() => {
    fetchCreator()
  }, [fetchCreator])

  useEffect(() => {
    if (!creator) return
    fetchLeagues()
    if (creator.isOwner) fetchAnalytics()
  }, [creator, fetchLeagues, fetchAnalytics])

  const toggleFollow = async (shouldFollow: boolean) => {
    if (!creator) return
    setFollowLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch(
        `/api/creators/${encodeURIComponent(creator.slug)}/${shouldFollow ? 'follow' : 'unfollow'}`,
        { method: 'POST' }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setStatusMessage(payload.error || 'Unable to update follow state')
        return
      }
      setCreator((current) =>
        current
          ? {
              ...current,
              isFollowing: shouldFollow,
              followerCount: Math.max(0, (current.followerCount ?? 0) + (shouldFollow ? 1 : -1)),
            }
          : current
      )
    } catch {
      setStatusMessage('Network error while updating follow state')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleShareProfile = async (url: string) => {
    if (!creator) return
    try {
      const response = await fetch(`/api/creators/${encodeURIComponent(creator.slug)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'profile_page', channel: 'direct' }),
      })
      const payload = await response.json().catch(() => ({}))
      await navigator.clipboard.writeText(payload.url || url)
      setStatusMessage('Creator profile link copied')
    } catch {
      setStatusMessage('Unable to copy creator profile link')
    }
  }

  const handleShareLeague = async (league: CreatorLeagueDto, url: string) => {
    try {
      const response = await fetch(`/api/creator/leagues/${encodeURIComponent(league.id)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'direct' }),
      })
      const payload = await response.json().catch(() => ({}))
      await navigator.clipboard.writeText(payload.url || url)
      setStatusMessage(`Invite copied for ${league.name}`)
    } catch {
      setStatusMessage('Unable to copy creator league invite')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading creator profile...
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Creator not found
          </p>
          <Link href="/creators" className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Back to creator discovery
          </Link>
        </div>
      </div>
    )
  }

  const publicLeagues = leagues.filter((league) => league.isPublic)

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/creators" className="mb-5 inline-block text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          Back to creators
        </Link>

        <CreatorProfileHeader
          creator={creator}
          isOwner={creator.isOwner}
          onFollow={() => toggleFollow(true)}
          onUnfollow={() => toggleFollow(false)}
          onShare={handleShareProfile}
          isFollowing={creator.isFollowing}
          followLoading={followLoading}
        />

        {(creator.hiddenLeagueCount ?? 0) > 0 && (
          <div
            className="mt-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(251, 146, 60, 0.35)',
              background: 'rgba(251, 146, 60, 0.10)',
              color: 'rgb(251, 146, 60)',
            }}
          >
            Some creator leagues are hidden because they sit outside your current ranking window.
            Commissioner invites can still unlock those rooms.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('community')}
            data-testid="creator-community-tab"
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: tab === 'community' ? 'var(--accent)' : 'var(--panel)',
              color: tab === 'community' ? 'var(--bg)' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            Community
          </button>
          <button
            type="button"
            onClick={() => setTab('analytics')}
            data-testid="creator-analytics-tab"
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: tab === 'analytics' ? 'var(--accent)' : 'var(--panel)',
              color: tab === 'analytics' ? 'var(--bg)' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            Analytics
          </button>
          {creator.isOwner && (
            <button
              type="button"
              onClick={() => setTab('branding')}
              data-testid="creator-branding-tab"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: tab === 'branding' ? 'var(--accent)' : 'var(--panel)',
                color: tab === 'branding' ? 'var(--bg)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Branding
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {tab === 'community' && (
              <>
                <CreatorCommunityPreview
                  leagues={publicLeagues}
                  creatorSlug={creator.slug}
                  emptyMessage={
                    (creator.hiddenLeagueCount ?? 0) > 0
                      ? 'No public leagues in your current ranking window yet.'
                      : 'This creator has not opened a public league yet.'
                  }
                />
                <div className="space-y-4">
                  {leagues.length === 0 ? (
                    <div className="rounded-[28px] border p-6 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                      No creator leagues available yet.
                    </div>
                  ) : (
                    leagues.map((league) => (
                      <CreatorLeagueCard key={league.id} league={league} onShare={handleShareLeague} />
                    ))
                  )}
                </div>
              </>
            )}

            {tab === 'analytics' &&
              (creator.isOwner ? (
                <CreatorStatsPanel
                  followerCount={analytics?.followCount ?? creator.followerCount ?? 0}
                  leagueCount={creator.leagueCount ?? leagues.length}
                  profileViews={analytics?.profileViews ?? 0}
                  inviteShares={analytics?.inviteShares ?? 0}
                  leagueJoins={analytics?.leagueJoins ?? 0}
                  leagueMembers={analytics?.leagueMembers ?? creator.totalLeagueMembers ?? 0}
                  conversionRate={analytics?.conversionRate ?? 0}
                  topShareChannel={analytics?.topShareChannel ?? null}
                  period={analytics?.period ?? '30d'}
                />
              ) : (
                <div
                  className="rounded-[28px] border p-6 text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Creator analytics are only visible to the creator owner or admins.
                </div>
              ))}

            {tab === 'branding' && creator.isOwner && (
              <CreatorBrandingEditor
                initialBranding={creator.branding}
                creatorIdOrSlug={creator.slug}
                onSaved={() => fetchCreator()}
              />
            )}
          </div>

          <aside className="space-y-6">
            <section
              className="rounded-[28px] border p-5"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--panel) 78%, transparent)',
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Snapshot
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                    Followers
                  </p>
                  <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>
                    {creator.followerCount ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                    Featured sports
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {creator.topSports?.join(' / ') || 'All sports'}
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                    Visibility
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {creator.visibility} profile • {creator.communityVisibility} community
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {statusMessage && (
          <p className="mt-4 text-sm" style={{ color: statusMessage.includes('Unable') ? 'var(--destructive)' : 'var(--muted)' }}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  )
}
