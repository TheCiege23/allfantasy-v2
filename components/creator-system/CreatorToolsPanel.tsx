'use client'

/**
 * Creator tools (PROMPT 299): public leagues, share league links, AI-generated content for audience.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Link2, Sparkles } from 'lucide-react'
import { CommunitySharePanel } from '@/components/community-integration'
import type { CreatorProfileDto, CreatorLeagueDto } from '@/lib/creator-system/types'

export interface CreatorToolsPanelProps {
  creator: CreatorProfileDto
  leagues: CreatorLeagueDto[]
  /** Base URL for invite links (e.g. window.location.origin) */
  baseUrl?: string
}

export function CreatorToolsPanel({ creator, leagues, baseUrl = '' }: CreatorToolsPanelProps) {
  const [copiedProfile, setCopiedProfile] = useState(false)
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null)

  const profileUrl = baseUrl ? `${baseUrl}/creators/${creator.slug}` : `/creators/${creator.slug}`

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopiedProfile(true)
      setTimeout(() => setCopiedProfile(false), 2000)
    })
  }

  const copyLeagueLink = (league: CreatorLeagueDto) => {
    const url = league.inviteUrl || `${baseUrl}/join?code=${league.inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLeagueId(league.id)
      setTimeout(() => setCopiedLeagueId(null), 2000)
    })
  }

  const publicLeagues = leagues.filter((l) => l.isPublic !== false)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Share your profile
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
          Followers can discover your leagues and join via this link.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            readOnly
            value={profileUrl}
            className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <button
            type="button"
            onClick={copyProfileLink}
            className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-2 shrink-0"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {copiedProfile ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedProfile ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Share league links
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
          Public leagues your followers can join. Copy invite link or share to Discord and Reddit.
        </p>
        {publicLeagues.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No public leagues yet. Create a league and set it to public to share with your audience.
          </p>
        ) : (
          <ul className="space-y-4">
            {publicLeagues.map((league) => {
              const inviteUrl = league.inviteUrl || `${baseUrl}/join?code=${league.inviteCode}`
              return (
                <li
                  key={league.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 50%, transparent)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                        {league.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {league.sport} · {league.memberCount}
                        {league.maxMembers > 0 ? ` / ${league.maxMembers}` : ''} members
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyLeagueLink(league)}
                        className="rounded-lg border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        {copiedLeagueId === league.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                        {copiedLeagueId === league.id ? 'Copied' : 'Copy invite'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <CommunitySharePanel
                      input={{
                        kind: 'generic',
                        title: `Join ${league.name} — ${creator.displayName || creator.handle}`,
                        description: league.description || `Join my fantasy league on AllFantasy.`,
                        url: inviteUrl,
                        extraLines: [`${league.sport} · ${creator.displayName || creator.handle}`],
                      }}
                      showWebhook={false}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
          AI-generated content for audience
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
          Create ready-to-post captions and images for draft results, weekly recaps, trade reactions, and power rankings. Share on X, Discord, Reddit, or Instagram.
        </p>
        <Link
          href="/app/social-content"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Sparkles className="h-4 w-4" />
          Create post for audience
        </Link>
      </section>
    </div>
  )
}
