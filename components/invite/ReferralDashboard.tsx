'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Users, Share2 } from 'lucide-react'
import { InviteModal } from './InviteModal'

interface InviteStats {
  totalCreated: number
  totalAccepted: number
  byType: Record<string, number>
  recentEvents: { eventType: string; channel: string | null; type: string; createdAt: string }[]
}

export function ReferralDashboard() {
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

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

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const s = stats ?? {
    totalCreated: 0,
    totalAccepted: 0,
    byType: {},
    recentEvents: [],
  }

  return (
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Links created</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.totalCreated}</p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Accepted</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.totalAccepted}</p>
        </div>
      </div>

      {s.recentEvents.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Recent activity
          </h3>
          <ul className="space-y-1 text-sm">
            {s.recentEvents.slice(0, 10).map((e, i) => (
              <li key={i} className="flex justify-between" style={{ color: 'var(--muted)' }}>
                <span>{e.eventType}{e.channel ? ` (${e.channel})` : ''} · {e.type}</span>
                <span className="text-xs">{new Date(e.createdAt).toLocaleString()}</span>
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
}
