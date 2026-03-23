'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Link2, Users, Share2, Copy, Check, UserPlus } from 'lucide-react'
import { InviteModal } from './InviteModal'
import { ReferralShareBar } from '@/components/referral/ReferralShareBar'
import { useUserTimezone } from '@/hooks/useUserTimezone'

interface InviteStats {
  totalCreated: number
  totalAccepted: number
  byType: Record<string, number>
  recentEvents: { eventType: string; channel: string | null; type: string; createdAt: string }[]
}

interface ReferredUser {
  referredUserId: string
  displayName: string | null
  createdAt: string
}

export function ReferralDashboard() {
  const { formatDateInTimezone, formatInTimezone } = useUserTimezone()
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [referralLink, setReferralLink] = useState<string | null>(null)
  const [referralCopied, setReferralCopied] = useState(false)
  const [referred, setReferred] = useState<ReferredUser[]>([])

  const fetchReferralLink = useCallback(() => {
    fetch('/api/referral/link')
      .then((r) => r.json())
      .then((data) => data?.link && setReferralLink(data.link))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchReferralLink()
  }, [fetchReferralLink])

  const copyReferralLink = useCallback(() => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setReferralCopied(true)
      setTimeout(() => setReferralCopied(false), 2000)
    })
  }, [referralLink])

  const fetchStats = useCallback(() => {
    fetch('/api/invite/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.stats) setStats(data.stats)
        else setStats(null)
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const fetchReferred = useCallback(() => {
    fetch('/api/referral/referred')
      .then((r) => r.json())
      .then((data) => (data.ok && Array.isArray(data.referred) ? setReferred(data.referred) : setReferred([])))
      .catch(() => setReferred([]))
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])
  useEffect(() => {
    fetchReferred()
  }, [fetchReferred])

  if (loading) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const statsSafe = (stats ?? {
    totalCreated: 0,
    totalAccepted: 0,
    byType: {},
    recentEvents: [],
  }) as InviteStats

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Invite & referral stats
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
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
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Your referral link</span>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Links created</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{statsSafe.totalCreated}</p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Accepted</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{statsSafe.totalAccepted}</p>
        </div>
      </div>

      {referred.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <UserPlus className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            Who you invited
          </h3>
          <ul className="space-y-2 text-sm">
            {referred.slice(0, 20).map((r, i) => (
              <li key={r.referredUserId} className="flex justify-between items-center" style={{ color: 'var(--muted)' }}>
                <span>{r.displayName || 'Friend'} signed up</span>
                <span className="text-xs">{formatDateInTimezone(r.createdAt)}</span>
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
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Recent activity
          </h3>
          <ul className="space-y-1 text-sm">
            {statsSafe.recentEvents.slice(0, 10).map((e, i) => (
              <li key={i} className="flex justify-between" style={{ color: 'var(--muted)' }}>
                <span>{e.eventType}{e.channel ? ` (${e.channel})` : ''} · {e.type}</span>
                <span className="text-xs">{formatInTimezone(e.createdAt)}</span>
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
      />
    </div>
  )
  return content
}
