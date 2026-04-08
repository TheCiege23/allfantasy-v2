/**
 * GET /api/player-valuations
 *
 * AI-facing endpoint: returns normalized cross-sport player valuations from DB cache.
 * Always reads from DB (never direct to Rolling Insights).
 *
 * Query params:
 *  sport     string  required  One of: nfl|nba|mlb|nhl|ncaaf|ncaab|soccer_euro
 *  position  string  optional  Filter by position (case-insensitive)
 *  limit     int     optional  Max players to return (default 50)
 *  sortBy    string  optional  "value" (default) | "adp"
 *  tier      string  optional  Filter by tier: S|A|B|C|D
 *  action    string  optional  "top" | "health" | "compact" | "values" (default)
 *  compact   bool    optional  Alternate compact payload toggle (same as action=compact)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiUsage } from '@/lib/telemetry/usage'
import { readPlayerValuationsFromDb } from '@/lib/player-valuation-features'
import { toApiChainSport } from '@/lib/workers/api-config'

export const dynamic = 'force-dynamic'

const VALID_SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer_euro'] as const
const VALID_TIERS = ['S', 'A', 'B', 'C', 'D'] as const

// Known aliases accepted in addition to canonical sport IDs
const RECOGNIZED_SPORT_INPUTS = new Set([
  ...VALID_SPORTS,
  'soccer', 'euro', 'epl', 'mls',
  'cfb', 'ncaafb', 'ncaa_football',
  'ncaam', 'ncaabasketball', 'ncaa_basketball',
])

export const GET = withApiUsage({ endpoint: '/api/player-valuations', tool: 'PlayerValuations' })(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)

      const sportRaw = (searchParams.get('sport') ?? '').toLowerCase().trim()
      const sport = toApiChainSport(sportRaw)

      // toApiChainSport has a fallback to 'nfl' for unknown sports; validate the raw
      // input against our explicit allowlist to avoid silently accepting garbage inputs.
      if (!sport || !RECOGNIZED_SPORT_INPUTS.has(sportRaw)) {
        return NextResponse.json(
          {
            error: `Invalid or missing sport. Must be one of: ${VALID_SPORTS.join(', ')}`,
          },
          { status: 400 }
        )
      }

      const position = searchParams.get('position') ?? undefined
      const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
      const sortByRaw = searchParams.get('sortBy') ?? 'value'
      const sortBy = sortByRaw === 'adp' ? 'adp' : 'value'
      const tierFilter = searchParams.get('tier')?.toUpperCase()
      const action = searchParams.get('action') ?? 'values'
      const compactToggle = ['1', 'true', 'yes'].includes((searchParams.get('compact') ?? '').toLowerCase())

      const cached = await readPlayerValuationsFromDb(sport, {
        allowStale: true,
        position,
        sortBy,
        // Fetch more than limit so we can apply tier filter post-sort
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

      const source = cached.stale
        ? `player-valuations-db-stale`
        : `player-valuations-db`

      const meta = {
        source,
        stale: cached.stale,
        syncedAt: cached.syncedAt,
        expiresAt: cached.expiresAt,
        sport,
      }

      // Filter by tier post-read
      let players = cached.players
      if (tierFilter && (VALID_TIERS as readonly string[]).includes(tierFilter)) {
        players = players.filter((p) => p.tier === tierFilter)
      }
      players = players.slice(0, limit)

      if (action === 'health') {
        // Summarized health view: just injury/health scores
        const healthView = players.map((p) => ({
          playerId: p.playerId,
          name: p.name,
          position: p.position,
          team: p.team,
          healthScore: p.healthScore,
          injuryTier: p.healthScore >= 90 ? 'healthy' : p.healthScore >= 60 ? 'questionable' : p.healthScore > 0 ? 'doubtful' : 'out',
          value: p.value,
          tier: p.tier,
          syncedAt: p.syncedAt,
        }))
        return NextResponse.json({ players: healthView, total: healthView.length, ...meta })
      }

      if (action === 'top') {
        return NextResponse.json({
          players,
          total: players.length,
          ...meta,
        })
      }

      if (action === 'compact' || compactToggle) {
        // Token-efficient AI payload: trims rawStats and focuses on decision signals.
        const compactPlayers = players.map((p) => ({
          id: p.playerId,
          n: p.name,
          sp: p.sport,
          pos: p.position,
          tm: p.team,
          v: p.value,
          t: p.tier,
          tr: p.trend,
          op: p.opportunityScore,
          hs: p.healthScore,
          fs: p.recentFormScore,
          adp: p.adp,
          ver: p.valuationVersion,
          at: p.syncedAt,
        }))
        return NextResponse.json({
          players: compactPlayers,
          total: compactPlayers.length,
          format: 'compact',
          ...meta,
        })
      }

      // Default: full valuation objects (AI can read rawStats for context)
      return NextResponse.json({
        players,
        total: players.length,
        ...meta,
      })
    } catch (error) {
      console.error('[api/player-valuations] error:', error)
      return NextResponse.json(
        { error: 'Failed to read player valuations' },
        { status: 500 }
      )
    }
  }
)
