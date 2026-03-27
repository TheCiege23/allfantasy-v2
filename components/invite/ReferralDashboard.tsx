'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { BarChart3, Check, Copy, Link2, Share2, UserPlus, Users } from 'lucide-react'
import { InviteModal } from './InviteModal'
import { ReferralShareBar } from '@/components/referral/ReferralShareBar'
import { useUserTimezone } from '@/hooks/useUserTimezone'
import type { InviteShareChannel, InviteStatsDto } from '@/lib/invite-engine/types'

interface ReferredUser {
  referredUserId: string
  displayName: string | null
  createdAt: string
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  return false
}

export function ReferralDashboard() {
  const { formatDateInTimezone, formatInTimezone } = useUserTimezone()
  const [stats, setStats] = useState<InviteStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [referralLink, setReferralLink] = useState<string | null>(null)
  const [referralCopied, setReferralCopied] = useState(false)
  const [referred, setReferred] = useState<ReferredUser[]>([])

  const fetchReferralLink = useCallback(() => {
    fetch('/api/referral/link')
      .then((response) => response.json())
      .then((data) => data?.link && setReferralLink(data.link))
      .catch(() => {})
  }, [])

  const fetchStats = useCallback(() => {
    fetch('/api/invite/stats')
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && data.stats) setStats(data.stats)
        else setStats(null)
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const fetchReferred = useCallback(() => {
    fetch('/api/referral/referred')
      .then((response) => response.json())
      .then((data) => (data.ok && Array.isArray(data.referred) ? setReferred(data.referred) : setReferred([])))
      .catch(() => setReferred([]))
  }, [])

  useEffect(() => {
    fetchReferralLink()
  }, [fetchReferralLink])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchReferred()
  }, [fetchReferred])

  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return
    const copied = await copyToClipboard(referralLink)
    if (!copied) return
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 2000)
  }, [referralLink])

  const statsSafe: InviteStatsDto =
    stats ?? {
      totalCreated: 0,
      totalAccepted: 0,
      totalViews: 0,
      totalShares: 0,
      activeLinks: 0,
      expiredLinks: 0,
      revokedLinks: 0,
      maxUsedLinks: 0,
      conversionRate: 0,
      byType: {},
      byChannel: {},
      recentEvents: [],
      topInvites: [],
      referredSignups: 0,
    }

  const handleInviteShared = (channel: InviteShareChannel) => {
    fetchStats()
  }

  if (loading) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Invite and referral stats
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Track growth loops across leagues, brackets, creator communities, and direct referrals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          data-testid="referral-create-invite"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Link2 className="h-4 w-4" />
          Create invite link
        </button>
      </div>

      {referralLink ? (
        <>
          <div
            className="rounded-xl border p-4 flex flex-wrap items-center gap-2"
            style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Your referral link
            </span>
            <input
              type="text"
              readOnly
              value={referralLink}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm max-w-md"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
            />
            <button
              type="button"
              onClick={copyReferralLink}
              data-testid="referral-copy-link"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {referralCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {referralCopied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="mt-3">
            <ReferralShareBar referralLink={referralLink} />
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Link2 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Links created
            </span>
          </div>
          <p data-testid="referral-total-created" className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {statsSafe.totalCreated}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Accepted
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {statsSafe.totalAccepted}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Views
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {statsSafe.totalViews}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Share2 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Shares
            </span>
          </div>
          <p data-testid="referral-total-shares" className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {statsSafe.totalShares}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="mb-1 flex items-center gap-2">
            <UserPlus className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Referred signups
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {statsSafe.referredSignups}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Share channel mix
          </h3>
          {Object.keys(statsSafe.byChannel).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No share activity yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statsSafe.byChannel).map(([channel, count]) => (
                <span
                  key={channel}
                  className="rounded-full border px-3 py-1 text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {channel}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Top invite links
          </h3>
          {statsSafe.topInvites.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No invite performance data yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {statsSafe.topInvites.map((invite) => (
                <li key={invite.inviteLinkId} className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text)' }}>
                    {invite.type.replace(/_/g, ' ')} - {invite.acceptedCount} accepts
                  </span>
                  <span style={{ color: 'var(--muted)' }}>{invite.conversionRate} conversion</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {referred.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            <UserPlus className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            Who you invited
          </h3>
          <ul className="space-y-2 text-sm">
            {referred.slice(0, 20).map((entry) => (
              <li key={entry.referredUserId} className="flex items-center justify-between" style={{ color: 'var(--muted)' }}>
                <span>{entry.displayName || 'Friend'} signed up</span>
                <span className="text-xs">{formatDateInTimezone(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {statsSafe.recentEvents.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Recent activity
          </h3>
          <ul className="space-y-1 text-sm">
            {statsSafe.recentEvents.slice(0, 10).map((event, index) => (
              <li key={`${event.createdAt}-${index}`} className="flex justify-between gap-3" style={{ color: 'var(--muted)' }}>
                <span>
                  {event.eventType}
                  {event.channel ? ` (${event.channel})` : ''} - {event.type}
                </span>
                <span className="text-xs">{formatInTimezone(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        inviteType="referral"
        onGenerated={() => fetchStats()}
        onShared={handleInviteShared}
      />
    </div>
  )
}
