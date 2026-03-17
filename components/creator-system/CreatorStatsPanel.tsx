'use client'

import { Users, Trophy, Share2, Eye } from 'lucide-react'

export interface CreatorStatsPanelProps {
  followerCount?: number
  leagueCount?: number
  profileViews?: number
  inviteShares?: number
  period?: string
}

export function CreatorStatsPanel({
  followerCount = 0,
  leagueCount = 0,
  profileViews = 0,
  inviteShares = 0,
  period = '30d',
}: CreatorStatsPanelProps) {
  const stats = [
    { label: 'Followers', value: followerCount, icon: Users },
    { label: 'Leagues', value: leagueCount, icon: Trophy },
    { label: 'Profile views', value: profileViews, icon: Eye },
    { label: 'Invite shares', value: inviteShares, icon: Share2 },
  ]

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Analytics
        {period && (
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
            ({period})
          </span>
        )}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--panel2)' }}
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--muted)' }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                {value}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
