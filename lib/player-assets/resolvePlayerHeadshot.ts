/**
 * E.1.5 — server-side player-headshot resolver.
 *
 * Resolves a real player headshot URL by checking, in order:
 *   - NFL: TheSportsDB -> Sleeper -> API-Sports -> ClearSports -> SportsPlayer cache
 *   - Other sports: ClearSports -> TheSportsDB -> API-Sports -> SportsPlayer cache
 *
 * If none of the above produce a valid HTTP/HTTPS image URL, returns
 * `{ imageUrl: null, source: 'none', confidence: 'none' }` so the UI's
 * silhouette+initials fallback (E.1) keeps applying.
 *
 * MUST be called server-side only — never from the browser. Provider keys
 * are server-only and rate-limited.
 *
 * Two callable shapes:
 *   - `resolvePlayerHeadshot(input)`            — single player (one network call per provider).
 *   - `createBatchPlayerHeadshotResolver()`     — factory for scripts that resolve many players;
 *                                                pre-loads ClearSports once and looks up locally.
 */

import { prisma } from '@/lib/prisma'
import { clearSportsFetch } from '@/lib/clear-sports/client'
import { theSportsDbProvider } from '@/lib/workers/providers/thesportsdb'
import { sleeperChainProvider } from '@/lib/workers/providers/sleeper-chain'
import { apiSportsProvider } from '@/lib/workers/providers/api-sports'
import { classifyAvatarSource } from '@/lib/draft-room/classify-avatar-source'

export type HeadshotProvider =
  | 'sleeper'
  | 'clearsports'
  | 'sportsdb'
  | 'apisports'
  | 'sportsplayer'
  | 'none'
export type HeadshotConfidence = 'exact' | 'name_team_position' | 'name_only' | 'none'

export interface ResolveHeadshotInput {
  name: string
  sport: string
  team?: string | null
  position?: string | null
  externalIds?: {
    clearSportsId?: string | null
    sleeperId?: string | null
    sportsDbId?: string | null
    rollingInsightsId?: string | null
  }
}

export interface ResolveHeadshotResult {
  imageUrl: string | null
  source: HeadshotProvider
  confidence: HeadshotConfidence
}

/**
 * Strip punctuation, lowercase, remove suffixes (Jr/Sr/II/III/IV/V),
 * collapse whitespace. Used for safe name comparisons across providers.
 */
export function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return ''
  let s = String(name).trim().toLowerCase()
  // Strip apostrophes, hyphens, periods entirely.
  s = s.replace(/[''`.,]/g, '')
  s = s.replace(/-/g, ' ')
  // Drop common suffixes after the last space.
  s = s.replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
  // Collapse repeated whitespace, trim.
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function normalizeTeam(team: string | null | undefined): string {
  return String(team ?? '').trim().toUpperCase()
}

/**
 * E.1.6 — generate name-search variants for provider lookups. Different sports
 * APIs index player names differently:
 *   - SportsDB tolerates spaces but not apostrophes/periods.
 *   - TheSportsAPI / api-sports also has its own indexing quirks.
 *
 * To maximize hit rate without spamming requests, we generate up to ~7 unique
 * variants per name and try them in order from "most specific" to "most lenient".
 * Used for both SportsDB and TheSportsAPI tiers in `resolvePlayerHeadshot`.
 *
 * Examples:
 *   Ja'Marr Chase   → ["Ja'Marr Chase", "JaMarr Chase", "Ja Marr Chase", "jamarr chase"]
 *   A.J. Brown      → ["A.J. Brown",   "AJ Brown",     "A J Brown",     "aj brown"]
 *   Amon-Ra St. Brown → ["Amon-Ra St. Brown", "AmonRa St Brown", "Amon Ra St Brown", "amon ra st brown"]
 *   D.K. Metcalf    → ["D.K. Metcalf", "DK Metcalf",   "D K Metcalf",   "dk metcalf"]
 *   Brian Thomas Jr. → original + suffix-stripped + normalized
 */
export function buildNameSearchVariants(rawName: string | null | undefined, normalized: string): string[] {
  const out: string[] = []
  const push = (v: string | null | undefined) => {
    const s = (v ?? '').trim()
    if (s && !out.includes(s)) out.push(s)
  }
  if (!rawName) {
    push(normalized)
    return out
  }
  // 1. Exact original (catches the easy cases first).
  push(rawName)
  // 2. Strip apostrophes/periods/commas/backticks but keep capitalization.
  //    "Ja'Marr Chase" → "JaMarr Chase"; "A.J. Brown" → "AJ Brown"
  push(rawName.replace(/[''`.,]/g, '').replace(/\s+/g, ' ').trim())
  // 3. Replace apostrophes/periods with spaces, then collapse — gives "Ja Marr",
  //    "A J", "D K", "Amon Ra" (same as hyphen→space).
  push(
    rawName
      .replace(/[''`.]/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  // 4. Hyphens → spaces only (preserve apostrophes/periods).
  //    "Amon-Ra St. Brown" → "Amon Ra St. Brown"
  push(rawName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim())
  // 5. Drop trailing Jr/Sr/II/III/IV/V after stripping punctuation.
  push(
    rawName
      .replace(/[''`.,]/g, '')
      .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
      .trim(),
  )
  // 6. Last resort: the full normalize-pool-name output (lowercase, no punctuation, no suffix).
  push(normalized)
  return out
}

function normalizePosition(pos: string | null | undefined): string {
  return String(pos ?? '').trim().toUpperCase()
}

/**
 * Validate that the URL is a real HTTP(S) image we want to render. Rejects:
 *   - empty / null
 *   - data: URIs (synthesized SVG placeholders — see E.1 audit)
 *   - team-logo paths (`/teamLogos/...`)
 */
export function isValidHeadshotUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const trimmed = String(url).trim()
  if (trimmed.length === 0) return false
  const source = classifyAvatarSource(trimmed)
  return source === 'headshot'
}

interface ClearSportsPlayerLite {
  id?: string
  name?: string
  full_name?: string
  position?: string
  team?: string | { name?: string; abbr?: string }
  team_abbr?: string
  image?: string
  image_url?: string
}

function getClearSportsImage(p: ClearSportsPlayerLite): string | null {
  const url = p.image ?? p.image_url ?? null
  return isValidHeadshotUrl(url) ? url : null
}

function clearSportsTeamCode(p: ClearSportsPlayerLite): string {
  const direct = p.team_abbr ?? null
  if (direct) return normalizeTeam(direct)
  if (typeof p.team === 'object' && p.team) return normalizeTeam(p.team.abbr ?? p.team.name ?? '')
  if (typeof p.team === 'string') return normalizeTeam(p.team)
  return ''
}

function clearSportsName(p: ClearSportsPlayerLite): string {
  return String(p.name ?? p.full_name ?? '').trim()
}

interface ClearSportsResponse {
  data?: ClearSportsPlayerLite[]
  players?: ClearSportsPlayerLite[]
  results?: ClearSportsPlayerLite[]
}

function extractPlayers(json: unknown): ClearSportsPlayerLite[] {
  if (Array.isArray(json)) return json as ClearSportsPlayerLite[]
  const obj = json as ClearSportsResponse | null | undefined
  if (!obj) return []
  return obj.data ?? obj.players ?? obj.results ?? []
}

async function fetchClearSportsPlayers(sport: string): Promise<ClearSportsPlayerLite[]> {
  const domain = sport.toLowerCase()
  try {
    const json = await clearSportsFetch<unknown>(`${domain}/players`)
    return extractPlayers(json)
  } catch {
    return []
  }
}

export interface BatchPlayerHeadshotResolver {
  resolve(input: ResolveHeadshotInput): Promise<ResolveHeadshotResult>
  /** Stats about the underlying ClearSports cache — useful for script summaries. */
  stats(): { clearSportsCacheSize: number; sport: string }
}

/**
 * Factory for scripts that resolve many players. Pre-fetches the entire
 * ClearSports player list for the sport ONCE, then matches each player in-memory
 * before falling back to SportsDB (per-player network call) and SportsPlayer.
 */
export async function createBatchPlayerHeadshotResolver(args: {
  sport: string
}): Promise<BatchPlayerHeadshotResolver> {
  const sport = String(args.sport || 'NFL').toUpperCase()
  const csPlayers = await fetchClearSportsPlayers(sport)

  // Build name → players index. Ambiguous names (multiple players with same normalized name)
  // are kept as a list; the caller resolves with team/position.
  const csByName = new Map<string, ClearSportsPlayerLite[]>()
  for (const p of csPlayers) {
    const nk = normalizePlayerName(clearSportsName(p))
    if (!nk) continue
    const list = csByName.get(nk) ?? []
    list.push(p)
    csByName.set(nk, list)
  }

  return {
    stats: () => ({ clearSportsCacheSize: csPlayers.length, sport }),
    async resolve(input: ResolveHeadshotInput): Promise<ResolveHeadshotResult> {
      return resolveOnce(input, sport, csByName)
    },
  }
}

/** Single-player resolution. Spawns its own ClearSports call (use the batch resolver for scripts). */
export async function resolvePlayerHeadshot(
  input: ResolveHeadshotInput,
): Promise<ResolveHeadshotResult> {
  const sport = String(input.sport || 'NFL').toUpperCase()
  const csPlayers = await fetchClearSportsPlayers(sport)
  const csByName = new Map<string, ClearSportsPlayerLite[]>()
  for (const p of csPlayers) {
    const nk = normalizePlayerName(clearSportsName(p))
    if (!nk) continue
    const list = csByName.get(nk) ?? []
    list.push(p)
    csByName.set(nk, list)
  }
  return resolveOnce(input, sport, csByName)
}

async function resolveOnce(
  input: ResolveHeadshotInput,
  sport: string,
  csByName: Map<string, ClearSportsPlayerLite[]>,
): Promise<ResolveHeadshotResult> {
  const targetName = normalizePlayerName(input.name)
  const targetTeam = normalizeTeam(input.team ?? '')
  const targetPos = normalizePosition(input.position ?? '')
  const isNfl = String(sport).trim().toUpperCase() === 'NFL'

  // ── 1. ClearSports (non-NFL primary) ──
  if (!isNfl && targetName.length > 0) {
    const candidates = csByName.get(targetName) ?? []
    if (candidates.length === 1) {
      const url = getClearSportsImage(candidates[0]!)
      if (url) {
        return {
          imageUrl: url,
          source: 'clearsports',
          confidence: targetTeam || targetPos ? 'exact' : 'name_only',
        }
      }
    } else if (candidates.length > 1) {
      // Disambiguate by team + position when available.
      const exact = candidates.find(
        (c) =>
          (targetTeam && clearSportsTeamCode(c) === targetTeam) ||
          (targetPos && normalizePosition(c.position ?? '') === targetPos),
      )
      if (exact) {
        const url = getClearSportsImage(exact)
        if (url) {
          return {
            imageUrl: url,
            source: 'clearsports',
            confidence: 'name_team_position',
          }
        }
      }
      // Multiple matches and we can't disambiguate safely — refuse to pick.
    }
  }

  // ── 2. SportsDB ──
  // Per-player headshot search. The provider's name index is unforgiving with
  // apostrophes / periods / hyphens, so we try several variants before giving up.
  const nameCandidates = buildNameSearchVariants(input.name, targetName)
  for (const candidate of nameCandidates) {
    try {
      const result = await theSportsDbProvider.fetch({
        sport,
        dataType: 'player_headshots',
        query: { search: candidate, teamCode: input.team ?? undefined },
      })
      const sdbUrl =
        result && typeof result === 'object' && 'headshotUrl' in (result as Record<string, unknown>)
          ? String((result as { headshotUrl?: unknown }).headshotUrl ?? '')
          : ''
      if (isValidHeadshotUrl(sdbUrl)) {
        return {
          imageUrl: sdbUrl,
          source: 'sportsdb',
          confidence: targetTeam ? 'name_team_position' : 'name_only',
        }
      }
    } catch {
      /* swallow — try next variant */
    }
  }

  // ── 3. Sleeper (NFL first backup) ──
  if (isNfl) {
    for (const candidate of nameCandidates) {
      try {
        const result = await sleeperChainProvider.fetch({
          sport,
          dataType: 'player_headshots',
          query: { search: candidate, teamCode: input.team ?? undefined },
        })
        const sleeperUrl =
          result && typeof result === 'object' && 'headshotUrl' in (result as Record<string, unknown>)
            ? String((result as { headshotUrl?: unknown }).headshotUrl ?? '')
            : ''
        if (isValidHeadshotUrl(sleeperUrl)) {
          return {
            imageUrl: sleeperUrl,
            source: 'sleeper',
            confidence: targetTeam ? 'name_team_position' : 'name_only',
          }
        }
      } catch {
        /* swallow — continue fallback chain */
      }
    }
  }

  // ── 3. TheSportsAPI (api-sports.io) ──
  // E.1.6 — third tier between SportsDB and the SportsPlayer cache. Recovers
  // headshots for the punctuation-outlier tail (Ja'Marr Chase, A.J. Brown,
  // Amon-Ra St. Brown, C.J. Stroud, D.K. Metcalf, Bo Nix, etc.) that SportsDB
  // misses because of its name indexing. Reuses the same variant generator so
  // we hit api-sports.io with the same set of name shapes.
  for (const candidate of nameCandidates) {
    try {
      const result = await apiSportsProvider.fetch({
        sport,
        dataType: 'player_headshots',
        query: { search: candidate, teamCode: input.team ?? undefined },
      })
      const apiUrl =
        result && typeof result === 'object' && 'headshotUrl' in (result as Record<string, unknown>)
          ? String((result as { headshotUrl?: unknown }).headshotUrl ?? '')
          : ''
      if (isValidHeadshotUrl(apiUrl)) {
        // Defensive: api-sports occasionally returns a generic placeholder for unknown
        // players. classifyAvatarSource (data: URI / team-logo path checks) catches the
        // common cases, and isValidHeadshotUrl wraps it.
        return {
          imageUrl: apiUrl,
          source: 'apisports',
          confidence: targetTeam ? 'name_team_position' : 'name_only',
        }
      }
    } catch {
      /* swallow — provider may be down or unconfigured */
    }
  }

  // ── 5. ClearSports (NFL deep fallback only) ──
  if (isNfl && targetName.length > 0) {
    const candidates = csByName.get(targetName) ?? []
    if (candidates.length === 1) {
      const url = getClearSportsImage(candidates[0]!)
      if (url) {
        return {
          imageUrl: url,
          source: 'clearsports',
          confidence: targetTeam || targetPos ? 'exact' : 'name_only',
        }
      }
    } else if (candidates.length > 1) {
      const exact = candidates.find(
        (c) =>
          (targetTeam && clearSportsTeamCode(c) === targetTeam) ||
          (targetPos && normalizePosition(c.position ?? '') === targetPos),
      )
      if (exact) {
        const url = getClearSportsImage(exact)
        if (url) {
          return {
            imageUrl: url,
            source: 'clearsports',
            confidence: 'name_team_position',
          }
        }
      }
    }
  }

  // ── 4. SportsPlayer DB cache ──
  try {
    // Case-insensitive lookup. Limit to current sport.
    const rows = await prisma.sportsPlayer.findMany({
      where: { sport, name: { contains: input.name, mode: 'insensitive' } },
      select: { name: true, team: true, position: true, imageUrl: true },
      take: 5,
    })
    const exact = rows.find(
      (r) =>
        normalizePlayerName(r.name) === targetName &&
        (targetTeam ? normalizeTeam(r.team) === targetTeam : true) &&
        (targetPos ? normalizePosition(r.position) === targetPos : true),
    )
    const fallback = rows.find((r) => normalizePlayerName(r.name) === targetName)
    const picked = exact ?? fallback
    if (picked && isValidHeadshotUrl(picked.imageUrl)) {
      return {
        imageUrl: picked.imageUrl,
        source: 'sportsplayer',
        confidence: exact ? 'name_team_position' : 'name_only',
      }
    }
  } catch {
    /* swallow */
  }

  return { imageUrl: null, source: 'none', confidence: 'none' }
}
