'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, Loader2 } from 'lucide-react'
import { CreatorCard } from '@/components/creator-system'
import type { CreatorProfileDto } from '@/lib/creator-system/types'

const SPORTS = ['NFL', 'NHL', 'NBA', 'MLB', 'NCAAF', 'NCAAB', 'SOCCER'] as const

export default function CreatorsDiscoveryClient() {
  const [creators, setCreators] = useState<CreatorProfileDto[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<string>('')
  const [followLoading, setFollowLoading] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  const fetchCreators = useCallback(() => {
    setLoading(true)
    const q = new URLSearchParams()
    q.set('limit', '24')
    if (sport) q.set('sport', sport)
    fetch(`/api/creators?${q.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.creators)) setCreators(data.creators)
        else setCreators([])
      })
      .catch(() => setCreators([]))
      .finally(() => setLoading(false))
  }, [sport])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const handleFollow = useCallback((creatorId: string) => {
    const creator = creators.find((c) => c.id === creatorId)
    if (!creator) return
    setFollowLoading(creatorId)
    const slug = creator.slug
    fetch(`/api/creators/${encodeURIComponent(slug)}/follow`, { method: 'POST' })
      .then((res) => {
        if (res.ok) setFollowing((prev) => new Set(prev).add(creatorId))
      })
      .finally(() => setFollowLoading(null))
  }, [creators])

  const handleShare = useCallback((creatorId: string, url: string) => {
    fetch(`/api/creators/${encodeURIComponent(creatorId)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {})
    navigator.clipboard?.writeText(url).then(() => {})
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
        className="rounded-2xl border p-12 text-center"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 30%, transparent)' }}
      >
        <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
        <p className="font-medium" style={{ color: 'var(--text)' }}>
          No creators yet
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Creator leagues will appear here when they’re available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Sport:
        </span>
        <button
          type="button"
          onClick={() => setSport('')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!sport ? 'opacity-100' : 'opacity-60'}`}
          style={{
            background: !sport ? 'var(--accent)' : 'var(--panel)',
            color: !sport ? 'var(--bg)' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          All
        </button>
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSport(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sport === s ? 'opacity-100' : 'opacity-60'}`}
            style={{
              background: sport === s ? 'var(--accent)' : 'var(--panel)',
              color: sport === s ? 'var(--bg)' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {creators.map((c) => (
          <li key={c.id}>
            <CreatorCard
              creator={c}
              onFollow={handleFollow}
              onShare={handleShare}
              isFollowing={following.has(c.id) ?? c.isFollowing}
              followLoading={followLoading === c.id}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
