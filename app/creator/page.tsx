'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Trophy, Users, Settings, Wrench } from 'lucide-react'
import { CreatorToolsPanel } from '@/components/creator-system'
import type { CreatorProfileDto, CreatorLeagueDto } from '@/lib/creator-system/types'

export default function CreatorDashboardPage() {
  const { data: session, status } = useSession()
  const [creator, setCreator] = useState<CreatorProfileDto | null>(null)
  const [leagues, setLeagues] = useState<CreatorLeagueDto[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)

  const fetchMe = useCallback(() => {
    if (!session?.user?.id) return
    setToolsLoading(true)
    fetch('/api/creators/me')
      .then((res) => (res.ok ? res.json() : { creator: null, leagues: [] }))
      .then((data: { creator: CreatorProfileDto | null; leagues: CreatorLeagueDto[] }) => {
        setCreator(data.creator ?? null)
        setLeagues(data.leagues ?? [])
      })
      .catch(() => { setCreator(null); setLeagues([]) })
      .finally(() => setToolsLoading(false))
  }, [session?.user?.id])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>
            Creator League System
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Sign in to create branded leagues and grow your community on AllFantasy.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Creator dashboard
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Manage your profile, leagues, and invite links. Let followers join your leagues and share AI-generated content with your audience.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/creators"
            className="rounded-xl border p-4 flex items-center gap-3 transition hover:opacity-90"
            style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--panel2)' }}>
              <Users className="h-5 w-5" style={{ color: 'var(--muted)' }} />
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Discover creators</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Browse and follow creators</p>
            </div>
          </Link>
          <Link
            href="/app/leagues"
            className="rounded-xl border p-4 flex items-center gap-3 transition hover:opacity-90"
            style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--panel2)' }}>
              <Trophy className="h-5 w-5" style={{ color: 'var(--muted)' }} />
            </div>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>My leagues</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Create and manage leagues</p>
            </div>
          </Link>
        </div>

        {creator && (
          <>
            <div className="mt-8 flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5" style={{ color: 'var(--muted)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Creator tools
              </h2>
            </div>
            {toolsLoading ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : (
              <CreatorToolsPanel
                creator={creator}
                leagues={leagues}
                baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
              />
            )}
          </>
        )}

        {!creator && (
          <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
            To become a creator and get a public profile with creator tools, your account must be verified. Contact support to request creator access.
          </p>
        )}
        <Link
          href="/support"
          className="inline-flex items-center gap-2 mt-6 text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          <Settings className="h-4 w-4" />
          Support
        </Link>
      </div>
    </div>
  )
}
