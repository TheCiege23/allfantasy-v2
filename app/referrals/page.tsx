'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ReferralDashboard, InviteManagementPanel } from '@/components/invite'

export default function ReferralsPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="max-w-xl mx-auto px-4 py-12">
          <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>
            Invite & referral dashboard
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Sign in to create invite links and view your referral stats.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="text-sm font-medium mb-6 inline-block" style={{ color: 'var(--muted)' }}>
          ← Home
        </Link>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>
          Invites & referrals
        </h1>
        <ReferralDashboard />
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Your invite links
          </h2>
          <InviteManagementPanel />
        </div>
      </div>
    </div>
  )
}
