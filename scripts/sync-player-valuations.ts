/**
 * Sync script: fetch Rolling Insights raw data for all 7 sports and write
 * normalized player valuations to SportsDataCache (DB-first).
 *
 * Usage:
 *   tsx scripts/sync-player-valuations.ts
 *   tsx scripts/sync-player-valuations.ts --sports=nfl,nba
 *   tsx scripts/sync-player-valuations.ts --ttlHours=12
 */

import { rollingInsightsProvider } from '@/lib/workers/providers/rolling-insights'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  computePlayerValuation,
  writePlayerValuationsToDb,
  type PlayerValuation,
} from '@/lib/player-valuation-features'
import type { ApiChainSport } from '@/lib/workers/api-config'

function loadDotenv(fileName: string): void {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadDotenv('.env.local')
loadDotenv('.env')

const ALL_SPORTS: ApiChainSport[] = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer_euro']

const DEFAULT_TTL_HOURS = 6
const NFL_IDP_POSITIONS = new Set(['DL', 'DE', 'DT', 'EDGE', 'LB', 'ILB', 'OLB', 'DB', 'CB', 'S', 'SS', 'FS'])
const DEFENSIVE_STAT_KEYS = [
  'tackles',
  'total_tackles',
  'solo_tackles',
  'assisted_tackles',
  'tackles_for_loss',
  'tfl',
  'sacks',
  'qb_hits',
  'forced_fumbles',
  'fumbles_recovered',
  'passes_defended',
  'interceptions',
  'defensive_touchdowns',
  'defensive_tds',
  'safeties',
] as const

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

function parseSportsArg(): ApiChainSport[] {
  const arg = process.argv.find((v) => v.startsWith('--sports='))
  if (!arg) return ALL_SPORTS
  const requested = arg
    .split('=')[1]
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as ApiChainSport[]
  const valid = requested.filter((s) => ALL_SPORTS.includes(s))
  return valid.length ? valid : ALL_SPORTS
}

function parseTtlArg(): number {
  const arg = process.argv.find((v) => v.startsWith('--ttlHours='))
  const hours = arg ? Number(arg.split('=')[1]) : DEFAULT_TTL_HOURS
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS
}

// ─── Raw player shape from Rolling Insights ──────────────────────────────────

interface RawRIPlayer {
  id?: string | number
  player_id?: string | number
  playerId?: string | number
  name?: string
  full_name?: string
  fullName?: string
  first_name?: string
  last_name?: string
  position?: string
  pos?: string
  team?: string
  team_abbr?: string
  teamAbbr?: string
  status?: string
  injury_status?: string
  injuryStatus?: string
  adp?: number
  average_draft_position?: number | string
  averageDraftPosition?: number | string
  stats?: Record<string, unknown>
  season_stats?: Record<string, unknown>
  seasonStats?: Record<string, unknown>
  [key: string]: unknown
}

interface RawRIInjury {
  player_id?: string | number
  playerId?: string | number
  name?: string
  player_name?: string
  status?: string
  injury_status?: string
  [key: string]: unknown
}

// ─── Data extraction helpers ──────────────────────────────────────────────────

function extractId(p: RawRIPlayer): string {
  const raw = p.id ?? p.player_id ?? p.playerId
  return raw != null ? String(raw) : ''
}

function extractName(p: RawRIPlayer): string {
  if (p.full_name) return String(p.full_name)
  if (p.fullName) return String(p.fullName)
  if ((p as Record<string, unknown>).player) return String((p as Record<string, unknown>).player)
  if (p.name) return String(p.name)
  if (p.first_name || p.last_name) return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
  return ''
}

function extractPosition(p: RawRIPlayer): string {
  return String(p.position ?? p.pos ?? 'UNK').toUpperCase()
}

function extractTeam(p: RawRIPlayer): string {
  return String(p.team ?? p.team_abbr ?? p.teamAbbr ?? 'UNK').toUpperCase()
}

function extractStats(p: RawRIPlayer): Record<string, unknown> {
  // RI may embed stats directly on the player object or under a stats sub-object
  const sub =
    p.stats ??
    p.season_stats ??
    p.seasonStats ??
    (p as Record<string, unknown>).regular_season ??
    (p as Record<string, unknown>).postseason
  if (sub && typeof sub === 'object') return sub as Record<string, unknown>
  // Fall back: extract any numeric fields that look like stats
  const inline: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'number' && !['id', 'player_id', 'adp'].includes(k)) {
      inline[k] = v
    }
  }
  return inline
}

function extractInjuryStatus(p: RawRIPlayer, injuryMap: Map<string, string>): string | null {
  // Prefer injury map from dedicated /injuries endpoint
  const id = extractId(p)
  if (id && injuryMap.has(id)) return injuryMap.get(id)!
  // Fallback: status on player object itself
  const raw = p.injury_status ?? p.injuryStatus ?? p.status
  return raw ? String(raw) : null
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

function extractAdpFromRecord(row: Record<string, unknown>): number | null {
  const candidates = [
    row.adp,
    row.ADP,
    row.average_draft_position,
    row.averageDraftPosition,
    row.avg_adp,
    row.avgAdp,
  ]
  for (const value of candidates) {
    const parsed = toFiniteNumber(value)
    if (parsed != null && parsed > 0) return parsed
  }
  return null
}

function extractAdpForPlayer(player: RawRIPlayer, adpMap: Map<string, number>): number | null {
  const playerId = extractId(player)
  if (playerId && adpMap.has(playerId)) return adpMap.get(playerId) ?? null

  const fromPlayer = extractAdpFromRecord(player as Record<string, unknown>)
  return fromPlayer != null ? fromPlayer : null
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

function hasDefensiveStats(stats: Record<string, unknown>): boolean {
  for (const key of DEFENSIVE_STAT_KEYS) {
    const n = toNumeric(stats[key])
    if (n != null && n > 0) return true
  }
  return false
}

function buildNflIdpFallbackStats(position: string): Record<string, number> {
  if (['LB', 'ILB', 'OLB'].includes(position)) {
    return {
      tackles: 40,
      solo_tackles: 26,
      assisted_tackles: 14,
      tackles_for_loss: 4,
      sacks: 2,
    }
  }
  if (['DL', 'DE', 'DT', 'EDGE'].includes(position)) {
    return {
      tackles: 28,
      solo_tackles: 18,
      assisted_tackles: 10,
      tackles_for_loss: 6,
      sacks: 4,
    }
  }
  return {
    tackles: 32,
    solo_tackles: 21,
    assisted_tackles: 11,
    passes_defended: 6,
    interceptions: 2,
  }
}

function toArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  return []
}

// ─── Per-sport sync ───────────────────────────────────────────────────────────

async function syncSport(sport: ApiChainSport, ttlMs: number): Promise<number> {
  console.log(`[player-valuations] [${sport}] fetching players…`)

  // 1. Fetch player list (includes bio + sometimes stats)
  const playersResult = await rollingInsightsProvider({ sport, dataType: 'players' })
  const rawPlayers = toArray(playersResult.data) as RawRIPlayer[]

  if (!rawPlayers.length) {
    console.warn(`[player-valuations] [${sport}] no players returned — skipping`)
    return 0
  }
  console.log(`[player-valuations] [${sport}] got ${rawPlayers.length} players`)

  // 2. Fetch injuries for health overlay
  const injuriesResult = await rollingInsightsProvider({ sport, dataType: 'injuries' })
  const rawInjuryRows = toArray(injuriesResult.data) as Array<RawRIInjury & { injuries?: unknown[] }>

  const rawInjuries: RawRIInjury[] = []
  for (const row of rawInjuryRows) {
    if (Array.isArray(row.injuries)) {
      for (const item of row.injuries) {
        if (!item || typeof item !== 'object') continue
        const injury = item as Record<string, unknown>
        const injuryPlayerId =
          typeof injury.player_id === 'string' || typeof injury.player_id === 'number'
            ? injury.player_id
            : undefined
        rawInjuries.push({
          player_id: injuryPlayerId,
          playerId: injuryPlayerId,
          name: typeof injury.player === 'string' ? injury.player : undefined,
          status: typeof injury.returns === 'string' ? injury.returns : undefined,
          injury_status: typeof injury.injury === 'string' ? injury.injury : undefined,
        })
      }
      continue
    }
    rawInjuries.push(row)
  }

  // Build injury map: playerId → status
  const injuryMap = new Map<string, string>()
  for (const inj of rawInjuries) {
    const pid = inj.player_id ?? inj.playerId
    const status = inj.status ?? inj.injury_status
    if (pid != null && status) {
      injuryMap.set(String(pid), String(status))
    }
  }
  console.log(`[player-valuations] [${sport}] injury overlay: ${injuryMap.size} records`)

  // 3. Fetch ADP (best-effort — not all sports have it)
  const adpResult = await rollingInsightsProvider({ sport, dataType: 'adp' })
  const rawAdp = toArray(adpResult.data) as Array<Record<string, unknown>>
  const adpMap = new Map<string, number>()
  for (const row of rawAdp) {
    const pid = row.player_id ?? row.playerId ?? row.id
    const adp = extractAdpFromRecord(row)
    if (pid != null && adp != null) adpMap.set(String(pid), adp)
  }

  // 4. Optionally fetch projections/rankings for richer stats (best-effort)
  const projResult = await rollingInsightsProvider({ sport, dataType: 'projections' })
  const rawProj = toArray(projResult.data) as RawRIPlayer[]
  const projMap = new Map<string, Record<string, unknown>>()
  for (const p of rawProj) {
    const id = extractId(p)
    if (id) projMap.set(id, extractStats(p))
  }

  // 5. Compute valuations
  const syncedAt = new Date().toISOString()
  const valuations: PlayerValuation[] = []
  let idpFallbackApplied = 0

  for (const raw of rawPlayers) {
    const playerId = extractId(raw)
    if (!playerId) continue

    const name = extractName(raw)
    if (!name) continue

    const position = extractPosition(raw)
    const team = extractTeam(raw)
    const playerStats = extractStats(raw)
    // Merge projection stats on top of player stats for richer signal
    const projStats = projMap.get(playerId) ?? {}
    let mergedStats = { ...projStats, ...playerStats }

    // Guarded fallback: if RI projections/ADP feeds are unavailable and an NFL IDP
    // player has no usable defensive stats, inject a conservative baseline bundle.
    if (sport === 'nfl' && NFL_IDP_POSITIONS.has(position) && !hasDefensiveStats(mergedStats)) {
      mergedStats = { ...mergedStats, ...buildNflIdpFallbackStats(position) }
      idpFallbackApplied++
    }

    const injuryStatus = extractInjuryStatus(raw, injuryMap)
    const adp = extractAdpForPlayer(raw, adpMap)

    const valuation = computePlayerValuation({
      playerId,
      name,
      sport,
      position,
      team,
      stats: mergedStats,
      injuryStatus,
      adp,
      syncedAt,
    })

    valuations.push(valuation)
  }

  // 6. Write to DB
  const result = await writePlayerValuationsToDb(sport, valuations, { ttlMs })
  if (sport === 'nfl') {
    console.log(`[player-valuations] [${sport}] IDP fallback applied: ${idpFallbackApplied}`)
  }
  console.log(
    `[player-valuations] [${sport}] ✓ ${result.count} valuations stored, key=${result.cacheKey}, expires=${result.expiresAt.toISOString()}`
  )
  return result.count
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sports = parseSportsArg()
  const ttlHours = parseTtlArg()
  const ttlMs = ttlHours * 60 * 60 * 1000

  console.log(
    `[player-valuations] starting sync (sports=${sports.join(',')}, ttl=${ttlHours}h)`
  )

  let totalPlayers = 0
  for (const sport of sports) {
    try {
      const count = await syncSport(sport, ttlMs)
      totalPlayers += count
    } catch (err) {
      console.error(`[player-valuations] [${sport}] sync failed:`, err)
    }
  }

  console.log(`[player-valuations] sync complete — ${totalPlayers} total valuations written`)
}

main().catch((err) => {
  console.error('[player-valuations] fatal error:', err)
  process.exit(1)
})
