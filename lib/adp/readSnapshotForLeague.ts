/**
 * D.5-test — read `AllFantasyAdpSnapshot` rows for a given league context.
 *
 * Server-side only. Returns entries in the same shape the legacy
 * `getAiAdpForLeague` produces, so callers (the `/api/leagues/[leagueId]/ai-adp`
 * route, the resolver, future UI code) can opt into the new table without
 * changing their consumer logic.
 *
 * Important: NEVER falls back to external/market ADP. If no snapshot exists for
 * the requested (sport, leagueType, draftType, scoringFormat, rosterFormat,
 * teamCount, season, draftMode) tuple, returns an empty `entries` array. The
 * UI must render em-dashes — that's the explicit user rule for AI ADP.
 */

import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  buildContextHash,
  type DraftContext,
  type DraftMode,
} from './computeAllFantasyAdp'

export interface AllFantasyAdpEntry {
  playerName: string
  position: string
  team: string | null
  /** Player key the resolver/table uses to join (`<lowercased name>|<lowercased position>`). */
  playerKey: string
  adp: number
  averageRound: number
  averagePickInRound: number
  minPick: number
  maxPick: number
  sampleSize: number
  /** Heuristic — flagged when sample size < 10 (UI shows a faint "low sample" pill). */
  lowSample: boolean
  sevenDayTrend: number | null
  thirtyDayTrend: number | null
}

export interface AllFantasyAdpReadResult {
  entries: AllFantasyAdpEntry[]
  totalDrafts: number
  computedAt: Date | null
  contextHash: string
  draftMode: DraftMode
}

const LOW_SAMPLE_THRESHOLD = 10

export async function readAllFantasyAdpForContext(
  context: DraftContext,
  options: { draftMode?: DraftMode } = {},
): Promise<AllFantasyAdpReadResult> {
  const draftMode = options.draftMode ?? 'real'
  const contextHash = buildContextHash(context)

  const rows = await prisma.allFantasyAdpSnapshot.findMany({
    where: { contextHash, draftMode },
    orderBy: { averageOverallPick: 'asc' },
    select: {
      playerKey: true,
      playerName: true,
      sampleSize: true,
      averageOverallPick: true,
      averageRound: true,
      averagePickInRound: true,
      minOverallPick: true,
      maxOverallPick: true,
      sevenDayTrend: true,
      thirtyDayTrend: true,
      lastUpdatedAt: true,
    },
  })

  const entries: AllFantasyAdpEntry[] = rows.map((r) => {
    // playerKey is `<name>|<position>` — split for the consumer shape.
    const [, posLower] = r.playerKey.split('|')
    return {
      playerName: r.playerName,
      position: (posLower ?? '').toUpperCase(),
      team: null, // team isn't stored in the snapshot — UI joins to pool by playerKey.
      playerKey: r.playerKey,
      adp: r.averageOverallPick,
      averageRound: r.averageRound,
      averagePickInRound: r.averagePickInRound,
      minPick: r.minOverallPick,
      maxPick: r.maxOverallPick,
      sampleSize: r.sampleSize,
      lowSample: r.sampleSize < LOW_SAMPLE_THRESHOLD,
      sevenDayTrend: r.sevenDayTrend,
      thirtyDayTrend: r.thirtyDayTrend,
    }
  })

  // totalDrafts — derive from max sampleSize across entries (rough but useful for UI).
  // The recompute script could store it separately later; for the test harness
  // this is sufficient to surface "N drafts" in tooltips.
  const totalDrafts = entries.reduce((max, e) => Math.max(max, e.sampleSize), 0)

  // computedAt — most recent lastUpdatedAt across the snapshot set.
  let computedAt: Date | null = null
  for (const r of rows) {
    if (!computedAt || r.lastUpdatedAt > computedAt) computedAt = r.lastUpdatedAt
  }

  return { entries, totalDrafts, computedAt, contextHash, draftMode }
}

/**
 * Convenience: derive context from a League row + season override and read entries.
 * Used by API routes that have a leagueId in hand.
 */
export async function readAllFantasyAdpForLeague(
  leagueId: string,
  options: { draftMode?: DraftMode; season?: string } = {},
): Promise<AllFantasyAdpReadResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      sport: true,
      season: true,
      scoring: true,
      isDynasty: true,
      leagueVariant: true,
      leagueSize: true,
      settings: true,
    },
  })
  if (!league) {
    return {
      entries: [],
      totalDrafts: 0,
      computedAt: null,
      contextHash: '',
      draftMode: options.draftMode ?? 'real',
    }
  }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const draftFromSettings = (settings.draft as { type?: string } | undefined)?.type ?? 'snake'

  const context: DraftContext = {
    sport: String(league.sport ?? 'NFL').toUpperCase(),
    leagueType: league.leagueVariant ?? (league.isDynasty ? 'dynasty' : 'redraft'),
    draftType: String(draftFromSettings).toLowerCase(),
    scoringFormat: String(league.scoring ?? 'ppr').toLowerCase(),
    rosterFormat: 'standard',
    teamCount: league.leagueSize ?? 12,
    season: options.season ?? String(league.season ?? new Date().getUTCFullYear()),
  }
  return readAllFantasyAdpForContext(context, options)
}
