/**
 * Optional structured player metadata on draft/league chat messages (GET/POST safe subset).
 * Stored under LeagueChatMessage.metadata.playerContext when present.
 */

import type { PlayerDisplayModel } from '@/lib/draft-sports-models/types'

export type DraftChatPlayerContext = {
  playerId?: string | null
  playerName?: string | null
  position?: string | null
  team?: string | null
  headshotUrl?: string | null
  teamLogoUrl?: string | null
  statSummary?: string | null
  injuryStatus?: string | null
  headlineSnippet?: string | null
}

const MAX_STR = 280

function trunc(s: string): string {
  return s.length > MAX_STR ? `${s.slice(0, MAX_STR)}…` : s
}

/** Accept only expected keys; strip unknown / oversized values. */
export function sanitizeDraftChatPlayerContext(raw: unknown): DraftChatPlayerContext | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const out: DraftChatPlayerContext = {}
  const opt = (k: keyof DraftChatPlayerContext) => {
    const v = o[k as string]
    if (typeof v !== 'string') return
    const t = v.trim()
    if (!t) return
    out[k] = trunc(t)
  }
  opt('playerId')
  opt('playerName')
  opt('position')
  opt('team')
  opt('headshotUrl')
  opt('teamLogoUrl')
  opt('statSummary')
  opt('injuryStatus')
  opt('headlineSnippet')
  return Object.keys(out).length > 0 ? out : null
}

/** Build optional chat metadata from live pool row + assistant headline (client or server). */
export function buildDraftChatPlayerContextFromDisplay(
  entry: {
    name: string
    position: string
    team?: string | null
    id?: string | null
    display?: PlayerDisplayModel | null
    adp?: number | null
  },
  extras?: { headlineSnippet?: string | null },
): DraftChatPlayerContext | null {
  const d = entry.display
  const headshotUrl = d?.assets?.headshotUrl ?? null
  const teamLogoUrl = d?.assets?.teamLogoUrl ?? d?.team?.logoUrl ?? null
  let statSummary: string | null = null
  if (d?.stats?.primaryStatLabel != null && d.stats.primaryStatValue != null) {
    statSummary = `${d.stats.primaryStatLabel} ${d.stats.primaryStatValue}`
  } else if (entry.adp != null) {
    statSummary = `ADP ${entry.adp}`
  }
  const raw: DraftChatPlayerContext = {
    playerId: d?.playerId ?? entry.id ?? null,
    playerName: d?.displayName ?? entry.name,
    position: entry.position,
    team: entry.team ?? d?.metadata?.teamAbbreviation ?? null,
    headshotUrl,
    teamLogoUrl,
    statSummary,
    injuryStatus: d?.metadata?.injuryStatus ?? null,
    headlineSnippet: extras?.headlineSnippet?.trim() || null,
  }
  return sanitizeDraftChatPlayerContext(raw)
}
