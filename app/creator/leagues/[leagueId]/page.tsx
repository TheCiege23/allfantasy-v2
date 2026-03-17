'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CreatorLeagueCard, CreatorInvitePanel } from '@/components/creator-system'
import type { CreatorLeagueDto } from '@/lib/creator-system/types'

export default function CreatorLeagueLandingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const leagueId = params?.leagueId as string
  const joinCode = searchParams?.get('join') || searchParams?.get('code')

  const [league, setLeague] = useState<CreatorLeagueDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinResult, setJoinResult] = useState<{ success: boolean; error?: string } | null>(null)

  const fetchLeague = useCallback(() => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    fetch(`/api/creator/leagues/${encodeURIComponent(leagueId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('League not found')
        return res.json()
      })
      .then(setLeague)
      .catch(() => setError('League not found'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => {
    fetchLeague()
  }, [fetchLeague])

  useEffect(() => {
    if (!joinCode || !league || joinResult !== null) return
    fetch('/api/creator-invites/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        setJoinResult({ success: data.success ?? false, error: data.error })
        if (data.success) fetchLeague()
      })
      .catch(() => setJoinResult({ success: false, error: 'Failed to join' }))
  }, [joinCode, league?.id, joinResult, fetchLeague])

  if (loading && !league) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="max-w-xl mx-auto px-4 py-12 text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {error || 'League not found'}
          </p>
          <Link href="/creators" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Browse creators
          </Link>
        </div>
      </div>
    )
  }

  const creatorSlug = league.creator?.slug ?? league.creatorId
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteUrl = league.inviteUrl || `${baseUrl}/creator/leagues/${league.id}?join=${league.inviteCode}`

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/creators/${encodeURIComponent(creatorSlug)}`}
          className="text-sm font-medium mb-6 inline-block"
          style={{ color: 'var(--muted)' }}
        >
          ← Back to creator
        </Link>

        {joinResult && (
          <div
            className="rounded-xl border p-4 mb-6"
            style={{
              borderColor: joinResult.success ? 'var(--accent)' : 'var(--destructive)',
              background: joinResult.success ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'color-mix(in srgb, var(--destructive) 15%, transparent)',
            }}
          >
            {joinResult.success ? (
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                You joined this league.
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--destructive)' }}>
                {joinResult.error || 'Could not join'}
              </p>
            )}
          </div>
        )}

        <CreatorLeagueCard league={league} showJoinButton={!league.isMember} />

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Invite others
          </h2>
          <CreatorInvitePanel inviteUrl={inviteUrl} inviteCode={league.inviteCode} />
        </section>
      </div>
    </div>
  )
}
