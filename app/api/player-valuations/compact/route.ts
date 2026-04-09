import { NextRequest, NextResponse } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { readPlayerValuationsFromDb } from '@/lib/player-valuation-features'
import { toApiChainSport } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'

const VALID_SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer_euro'] as const
const VALID_TIERS = ['S', 'A', 'B', 'C', 'D'] as const

const RECOGNIZED_SPORT_INPUTS = new Set([
  ...VALID_SPORTS,
  'soccer', 'euro', 'epl', 'mls',
  'cfb', 'ncaafb', 'ncaa_football',
  'ncaam', 'ncaabasketball', 'ncaa_basketball',
])

const COMPACT_FIELD_ORDER = [
  'id',
  'n',
  'sp',
  'pos',
  'tm',
  'v',
  't',
  'tr',
  'op',
  'hs',
  'fs',
  'adp',
  'ver',
  'at',
] as const

type CompactField = (typeof COMPACT_FIELD_ORDER)[number]

const DEFAULT_COMPACT_FIELDS: CompactField[] = ['id', 'n', 'sp', 'pos', 'tm', 'v', 't', 'tr', 'op', 'hs', 'fs']

function parseFieldMask(raw: string | null): CompactField[] {
  if (!raw) return DEFAULT_COMPACT_FIELDS

  const allowed = new Set<CompactField>(COMPACT_FIELD_ORDER)
  const requested = raw
    .split(',')
    .map((token) => token.trim() as CompactField)
    .filter((token) => token.length > 0 && allowed.has(token))

  const unique = Array.from(new Set(requested))
  if (!unique.length) return DEFAULT_COMPACT_FIELDS

  // Keep stable key order for deterministic payloads and caching behavior.
  const withRequiredId = unique.includes('id') ? unique : ['id', ...unique]
  return COMPACT_FIELD_ORDER.filter((field) => withRequiredId.includes(field))
}

function toCompactRecord(
  player: {
    playerId: string
    name: string
    sport: string
    position: string
    team: string
    value: number
    tier: string
    trend: string
    opportunityScore: number
    healthScore: number
    recentFormScore: number
    adp: number | null
    valuationVersion: string
    syncedAt: string
  },
  fields: CompactField[]
): Record<string, string | number | null> {
  const full: Record<CompactField, string | number | null> = {
    id: player.playerId,
    n: player.name,
    sp: player.sport,
    pos: player.position,
    tm: player.team,
    v: player.value,
    t: player.tier,
    tr: player.trend,
    op: player.opportunityScore,
    hs: player.healthScore,
    fs: player.recentFormScore,
    adp: player.adp,
    ver: player.valuationVersion,
    at: player.syncedAt,
  }

  const masked: Record<string, string | number | null> = {}
  for (const field of fields) {
    masked[field] = full[field]
  }
  return masked
}

export const GET = withApiUsage({ endpoint: '/api/player-valuations/compact', tool: 'PlayerValuationsCompact' })(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)

      const sportRaw = (searchParams?.get('sport') ?? '').toLowerCase().trim()
      const sport = toApiChainSport(sportRaw)
      if (!sport || !RECOGNIZED_SPORT_INPUTS.has(sportRaw)) {
        return NextResponse.json(
          { error: `Invalid or missing sport. Must be one of: ${VALID_SPORTS.join(', ')}` },
          { status: 400 }
        )
      }

      const position = searchParams?.get('position') ?? undefined
      const tierFilter = searchParams?.get('tier')?.toUpperCase()
      const limit = Math.min(500, Math.max(1, parseInt(searchParams?.get('limit') ?? '50')))
      const sortByRaw = searchParams?.get('sortBy') ?? 'value'
      const sortBy = sortByRaw === 'adp' ? 'adp' : 'value'

      const fields = parseFieldMask(searchParams?.get('fields'))

      const cached = await readPlayerValuationsFromDb(sport, {
        allowStale: true,
        position,
        sortBy,
        limit: tierFilter ? undefined : limit,
      })

      if (!cached.players.length) {
        return NextResponse.json(
          {
            error: `Player valuation cache is empty for sport "${sport}". Run sync:player-valuations to ingest data.`,
            sport,
          },
          { status: 503 }
        )
      }

      let players = cached.players
      if (tierFilter && (VALID_TIERS as readonly string[]).includes(tierFilter)) {
        players = players.filter((p) => p.tier === tierFilter)
      }
      players = players.slice(0, limit)

      const compactPlayers = players.map((p) => toCompactRecord(p, fields))

      return NextResponse.json({
        players: compactPlayers,
        total: compactPlayers.length,
        fields,
        format: 'compact',
        source: cached.stale ? 'player-valuations-db-stale' : 'player-valuations-db',
        stale: cached.stale,
        syncedAt: cached.syncedAt,
        expiresAt: cached.expiresAt,
        sport,
      })
    } catch (error) {
      console.error('[api/player-valuations/compact] error:', error)
      return NextResponse.json({ error: 'Failed to read compact player valuations' }, { status: 500 })
    }
  }
)

