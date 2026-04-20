'use client'

/**
 * Hero media for Create League — wraps the v2 video player with an AI-dashboard-style frame.
 * Video priority: concept → draft → sport (`resolveCreateLeagueHeroMedia`).
 */

import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { ResolvedCreateLeagueMedia } from '@/lib/create-league-v2/media-priority'
import { CreateLeagueHeroMedia } from '@/components/create-league-v2/CreateLeagueHeroMedia'

export function CreateLeagueMedia({
  media,
  accent,
}: {
  media: ResolvedCreateLeagueMedia
  accent: AccentTone
}) {
  return (
    <div className="relative" data-testid="create-league-media">
      <div
        className="pointer-events-none absolute -inset-px z-10 rounded-[1.05rem] bg-gradient-to-br from-cyan-400/20 via-transparent to-violet-500/10 opacity-60 blur-sm"
        aria-hidden
      />
      <div className="relative rounded-3xl ring-1 ring-cyan-500/20">
        <CreateLeagueHeroMedia media={media} accent={accent} />
      </div>
    </div>
  )
}
