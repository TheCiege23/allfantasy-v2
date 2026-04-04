'use client'

import Link from 'next/link'
import { ZombieEventCard, type ZombieFeedEvent } from './ZombieEventCard'

function mapAnimationType(t: string): ZombieFeedEvent['kind'] {
  if (t.includes('maul')) return 'mauling_event'
  if (t.includes('bash')) return 'bashing_event'
  if (t.includes('revive') || t === 'player_revived') return 'revival_event'
  if (t.includes('infect') || t === 'zombie_turn') return 'infection_event'
  if (t.includes('weapon')) return 'weapon_event'
  if (t.includes('serum')) return 'serum_event'
  if (t.includes('ambush')) return 'ambush_event'
  if (t.includes('whisperer')) return 'whisperer_replaced'
  if (t.includes('horde')) return 'horde_milestone'
  if (t.includes('last_survivor')) return 'last_survivor'
  return 'animation'
}

export function ZombieEventFeed({
  animations,
  announcements,
  maxItems = 10,
  compact,
  leagueId,
  leagueName,
}: {
  animations: Array<{
    id: string
    animationType: string
    week: number
    metadata: unknown
    createdAt: string | Date
  }>
  announcements: Array<{
    id: string
    type: string
    title: string
    content: string
    week: number | null
    createdAt: string | Date
  }>
  maxItems?: number
  compact?: boolean
  leagueId?: string
  leagueName?: string | null
}) {
  type Enriched = ZombieFeedEvent & { _ts: number }
  const events: Enriched[] = []

  for (const a of animations) {
    const meta = (a.metadata ?? {}) as Record<string, unknown>
    events.push({
      id: `anim-${a.id}`,
      kind: mapAnimationType(a.animationType),
      title: formatAnimationTitle(a.animationType, meta),
      subtitle: undefined,
      week: a.week,
      leagueName: leagueName ?? null,
      _ts: new Date(a.createdAt).getTime(),
    })
  }

  for (const n of announcements) {
    events.push({
      id: `ann-${n.id}`,
      kind: 'announcement',
      title: n.title,
      subtitle: n.content.slice(0, 120) + (n.content.length > 120 ? '…' : ''),
      week: n.week,
      leagueName: leagueName ?? null,
      _ts: new Date(n.createdAt).getTime(),
    })
  }

  events.sort((x, y) => y._ts - x._ts)

  const slice = events.slice(0, maxItems).map(({ _ts: _t, ...rest }) => rest)

  return (
    <div className="space-y-2">
      {slice.map((e) => (
        <ZombieEventCard key={e.id} event={e} compact={compact} />
      ))}
      {leagueId && !compact ? (
        <Link
          href={`/zombie/${leagueId}/history`}
          className="block text-center text-[12px] font-medium text-sky-400/90 hover:text-sky-300"
          data-testid="zombie-view-all-events"
        >
          View all events
        </Link>
      ) : null}
    </div>
  )
}

function formatAnimationTitle(type: string, meta: Record<string, unknown>): string {
  if (type === 'zombie_turn') return '🧟 The infection spreads.'
  if (type === 'player_revived') return '⚡ A player has returned from the dead.'
  if (type === 'mauling') return '💀 A mauling shook the island.'
  if (type === 'bashing') return '🔥 A bashing dominated the scoreboard.'
  if (type === 'weapon_acquired' || type === 'weapon_stolen') return '⚔️ A weapon moved on the field.'
  if (type === 'serum_used') return '🧪 A serum was consumed. One Survivor lives.'
  if (type === 'ambush_triggered') return '⚠️ The Whisperer stirred. Something changed.'
  if (type === 'whisperer_replaced') return '🎭 The old Whisperer has fallen. A new shadow rises.'
  if (type === 'horde_grows') return `🧟 The Horde grows.${meta.hordeSize != null ? ` ${String(meta.hordeSize)} strong.` : ''}`
  if (type === 'last_survivor') return `🧍 Only a few Survivors remain.`
  if (type === 'bomb_detonated') return '💣 A bomb detonated in the league.'
  return `📣 ${type.replace(/_/g, ' ')}`
}
