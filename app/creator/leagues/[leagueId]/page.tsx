'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { CreatorInvitePanel, CreatorLeagueCard } from '@/components/creator-system'
import { DiscoveryViewTracker } from '@/components/discovery/DiscoveryViewTracker'
import type { CreatorLeagueDto } from '@/lib/creator-system/types'

export default function CreatorLeagueLandingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const leagueId = String(params?.leagueId || '')
  const joinCode = searchParams?.get('join') || searchParams?.get('code') || ''

  const [league, setLeague] = useState<CreatorLeagueDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinResult, setJoinResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const joinAttemptedRef = useRef(false)

  const fetchLeague = useCallback(() => {
    if (!leagueId) return
    setLoading(true)
    fetch(`/api/creator/leagues/${encodeURIComponent(leagueId)}${joinCode ? `?join=${encodeURIComponent(joinCode)}` : ''}`)
      .then((response) => {
        if (!response.ok) throw new Error('not_found')
        return response.json()
      })
      .then((payload) => {
        setLeague(payload)
        setError(null)
      })
      .catch(() => {
        setError('League not found')
        setLeague(null)
      })
      .finally(() => setLoading(false))
  }, [joinCode, leagueId])

  useEffect(() => {
    fetchLeague()
  }, [fetchLeague])

  useEffect(() => {
    joinAttemptedRef.current = false
  }, [joinCode, leagueId])

  useEffect(() => {
    if (!joinCode || !league || joinResult) return
    if (joinAttemptedRef.current) return
    joinAttemptedRef.current = true
    fetch('/api/creator-invites/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode }),
    })
      .then((response) => response.json())
      .then((payload) => {
        setJoinResult({ success: payload.success ?? false, error: payload.error })
        if (payload.success) fetchLeague()
      })
      .catch(() => setJoinResult({ success: false, error: 'Failed to join league' }))
  }, [fetchLeague, joinCode, joinResult, league])

  const handleShareInvite = async () => {
    if (!league) return
    try {
      const response = await fetch(`/api/creator/leagues/${encodeURIComponent(league.id)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'direct' }),
      })
      const payload = await response.json().catch(() => ({}))
      setStatusMessage(payload.url ? 'Invite copied' : 'Unable to copy invite')
    } catch {
      setStatusMessage('Unable to copy invite')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading creator league...
      </div>
    )
  }

  if (!league || error) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {error || 'League not found'}
          </p>
          <Link href="/creators" className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Browse creators
          </Link>
        </div>
      </div>
    )
  }

  const creatorSlug = league.creator?.slug ?? league.creatorId
  const inviteUrl =
    league.inviteUrl ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/creator/leagues/${league.id}?join=${league.inviteCode}`

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <DiscoveryViewTracker
        leagueId={league.id}
        source="creator"
        leagueName={league.name}
        sport={league.sport ?? undefined}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          href={`/creators/${encodeURIComponent(creatorSlug)}`}
          data-testid="creator-league-back-to-profile"
          className="mb-5 inline-block text-sm font-semibold"
          style={{ color: 'var(--muted)' }}
        >
          Back to creator
        </Link>

        {joinResult && (
          <div
            data-testid="creator-league-join-result"
            className="mb-5 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: joinResult.success ? 'var(--accent)' : 'var(--destructive)',
              color: joinResult.success ? 'var(--text)' : 'var(--destructive)',
              background: joinResult.success
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            }}
          >
            {joinResult.success ? 'You joined this league.' : joinResult.error || 'Could not join this league.'}
          </div>
        )}

        {league.inviteOnlyByTier && !joinCode && !league.isMember && (
          <div
            className="mb-5 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(251, 146, 60, 0.35)',
              background: 'rgba(251, 146, 60, 0.10)',
              color: 'rgb(251, 146, 60)',
            }}
            data-testid="creator-league-tier-gate"
          >
            This league is outside your current ranking window. You can still join if a commissioner
            sends you a direct invite code.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <CreatorLeagueCard
              league={league}
              showJoinButton={!league.isMember && (!league.inviteOnlyByTier || Boolean(joinCode))}
            />

            <section
              className="rounded-[28px] border p-5"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--panel) 75%, transparent)',
              }}
            >
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  Creator commentary
                </h2>
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {league.latestRecapTitle}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                {league.latestRecapSummary}
              </p>
              {league.latestCommentary && (
                <p className="mt-3 text-sm" style={{ color: 'var(--text)' }}>
                  {league.latestCommentary}
                </p>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <CreatorInvitePanel
              inviteUrl={inviteUrl}
              inviteCode={league.inviteCode}
              onCopy={() => setStatusMessage('Invite copied')}
              onShare={handleShareInvite}
            />

            <section
              className="rounded-[28px] border p-5"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--panel) 75%, transparent)',
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Landing page notes
              </h3>
              <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--muted)' }}>
                <p>Visibility: {league.isPublic ? 'Public branded community' : 'Invite-only room'}</p>
                <p>Members: {league.memberCount}{league.maxMembers > 0 ? ` / ${league.maxMembers}` : ''}</p>
                <p>League tier: {league.leagueTier ? `Tier ${league.leagueTier}` : 'Open tier'}</p>
                <p>Share URL: {league.shareUrl}</p>
              </div>
            </section>
          </div>
        </div>

        {statusMessage && (
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  )
}
