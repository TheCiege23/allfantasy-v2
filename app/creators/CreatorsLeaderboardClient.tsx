'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Trophy, Users } from 'lucide-react'
import { VerifiedCreatorBadge } from '@/components/creator/VerifiedCreatorBadge'

type CreatorLeaderboardRow = {
  userId: string
  handle: string
  slug?: string
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
  verificationBadge?: string | null
  leagueCount: number
  totalMembers: number
  rank: number
}

export default function CreatorsLeaderboardClient() {
  const [creators, setCreators] = useState<CreatorLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'members' | 'leagues'>('members')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/creators?limit=25&sort=${sort}`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.creators)) setCreators(payload.creators)
        else setCreators([])
      })
      .catch(() => setCreators([]))
      .finally(() => setLoading(false))
  }, [sort])

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
        <Trophy className="mx-auto h-12 w-12" style={{ color: 'var(--muted)' }} />
        <p className="mt-3 font-medium" style={{ color: 'var(--text)' }}>
          No featured creators yet
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Featured creator rankings will appear here as communities start growing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Rank by
        </span>
        <button
          type="button"
          onClick={() => setSort('members')}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: sort === 'members' ? 'var(--accent)' : 'var(--panel)',
            color: sort === 'members' ? 'var(--bg)' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          Members
        </button>
        <button
          type="button"
          onClick={() => setSort('leagues')}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: sort === 'leagues' ? 'var(--accent)' : 'var(--panel)',
            color: sort === 'leagues' ? 'var(--bg)' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          Leagues
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border" style={{ borderColor: 'var(--border)' }}>
        {creators.map((creator) => (
          <Link
            key={creator.userId}
            href={`/creators/${encodeURIComponent(creator.slug || creator.handle)}`}
            data-testid={`creator-leaderboard-profile-link-${creator.handle}`}
            className="flex items-center gap-4 border-b px-4 py-4 transition hover:opacity-90 last:border-b-0"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'color-mix(in srgb, var(--panel2) 80%, transparent)' }}
            >
              <span className="text-sm font-semibold">{creator.rank}</span>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: 'var(--panel2)' }}
            >
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {(creator.displayName || creator.handle).slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{creator.displayName || creator.handle}</span>
                {creator.verified && (
                  <VerifiedCreatorBadge
                    handle={creator.handle}
                    badge={creator.verificationBadge}
                    showLabel={false}
                    linkToProfile={false}
                    size="sm"
                  />
                )}
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                @{creator.handle}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs" style={{ color: 'var(--muted)' }}>
              <p className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                {creator.leagueCount} leagues
              </p>
              <p className="mt-1 inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {creator.totalMembers} members
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
