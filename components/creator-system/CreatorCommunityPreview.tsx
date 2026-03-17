'use client'

import Link from 'next/link'
import { Users, Trophy } from 'lucide-react'
import type { CreatorLeagueDto } from '@/lib/creator-system/types'

export interface CreatorCommunityPreviewProps {
  leagues: CreatorLeagueDto[]
  creatorSlug: string
  emptyMessage?: string
}

export function CreatorCommunityPreview({
  leagues,
  creatorSlug,
  emptyMessage = 'No public leagues yet.',
}: CreatorCommunityPreviewProps) {
  if (leagues.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 30%, transparent)' }}
      >
        <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {emptyMessage}
        </p>
      </div>
    )
  }

  const totalMembers = leagues.reduce((s, l) => s + l.memberCount, 0)

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" style={{ color: 'var(--muted)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Community
        </h3>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {leagues.length} league{leagues.length !== 1 ? 's' : ''} · {totalMembers} members
        </span>
      </div>
      <ul className="space-y-2">
        {leagues.slice(0, 5).map((league) => (
          <li key={league.id}>
            <Link
              href={`/creator/leagues/${encodeURIComponent(league.id)}`}
              className="block rounded-lg border px-3 py-2 text-sm hover:opacity-90 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span className="font-medium truncate block">{league.name}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {league.sport} · {league.memberCount}
                {league.maxMembers > 0 ? ` / ${league.maxMembers}` : ''} members
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {leagues.length > 5 && (
        <Link
          href={`/creators/${encodeURIComponent(creatorSlug)}`}
          className="block text-center text-sm font-medium mt-3"
          style={{ color: 'var(--accent)' }}
        >
          View all leagues →
        </Link>
      )}
    </div>
  )
}
