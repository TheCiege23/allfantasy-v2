/**
 * Rolling Insights DataFeeds:
 * - GraphQL + OAuth (client_credentials): NFL, MLB rosters/teams
 * - REST (?RSC_token=CLIENT_ID): NBA, NHL, NCAAFB, NCAABB, SOCCER, PGA (RSC = `ROLLING_INSIGHTS_CLIENT_ID2`)
 */

import { unstable_cache } from 'next/cache'

// ── Legacy map shape (consumers: Player enrichment, /api/players/sync) ─────
export type RiPlayerValue = {
  name: string
  headshot_url: string | null
  position: string
  team: string
  /** ESPN player id when present in RI payloads */
  espn_id?: string | null
}

export type RiPlayerMap = Record<string, RiPlayerValue>

const DEFAULT_REST_BASE = 'http://rest.datafeeds.rolling-insights.com/api/v1'

function getRestBase(): string {
  const b = process.env.ROLLING_INSIGHTS_REST_BASE?.trim().replace(/\/+$/, '')
  return b || DEFAULT_REST_BASE
}

// ── OAuth token cache (GraphQL only) ───────────────────────────────────────
const tokenCache: Record<string, { token: string; expiresAt: number }> = {}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = clientId
  const cached = tokenCache[cacheKey]
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token

  const res = await fetch('https://datafeeds.rolling-insights.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`RI auth failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  const token = data.access_token
  if (!token) throw new Error('RI auth: missing access_token')
  const expiresIn = data.expires_in ?? 3600
  tokenCache[cacheKey] = { token, expiresAt: Date.now() + expiresIn * 1000 }
  return token
}

async function riQuery(query: string, clientId: string, clientSecret: string): Promise<unknown> {
  const token = await getAccessToken(clientId, clientSecret)
  const res = await fetch('https://datafeeds.rolling-insights.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`RI GraphQL failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { data?: unknown; errors?: unknown }
  if (json.errors) console.warn('RI GraphQL errors:', json.errors)
  return json.data
}

function getGraphQLCredentials(sport: string): { clientId: string; clientSecret: string } {
  const set2Sports = ['MLB']
  if (set2Sports.includes(sport.toUpperCase())) {
    return {
      clientId: process.env.ROLLING_INSIGHTS_CLIENT_ID2 ?? '',
      clientSecret: process.env.ROLLING_INSIGHTS_CLIENT_SECRET2 ?? '',
    }
  }
  return {
    clientId: process.env.ROLLING_INSIGHTS_CLIENT_ID ?? '',
    clientSecret: process.env.ROLLING_INSIGHTS_CLIENT_SECRET ?? '',
  }
}

const SPORT_QUERY_MAP: Record<string, { roster: string; teams: string }> = {
  NFL: { roster: 'nflRoster', teams: 'nflTeams' },
  MLB: { roster: 'mlbRoster', teams: 'mlbTeams' },
}

function getCurrentSeason(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

/** GraphQL `img` is often a bare filename/UUID until CDN base is documented — skip for headshot chain. */
function graphqlPlayerImgToHeadshotUrl(img: unknown): string {
  const s = String(img ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

function graphqlTeamImgToUrl(img: unknown): string {
  const s = String(img ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

export type RIPlayer = {
  ri_id: string
  name: string
  position: string
  team_abbr: string
  team_name: string
  team_img: string
  headshot_url: string
  sport: string
}

export type RITeam = {
  ri_id: string
  name: string
  abbr: string
  mascot: string
  logo_url: string
  sport: string
}

const GRAPHQL_SPORTS = new Set(['NFL', 'MLB'])

const REST_SPORTS = new Set(['NBA', 'NHL', 'NCAAFB', 'NCAABB', 'SOCCER', 'PGA'])

function getRscTokenSet2(): string {
  return process.env.ROLLING_INSIGHTS_CLIENT_ID2?.trim() ?? ''
}

/** One log per sport per process — sample raw REST player shape. */
const restPlayerSampleLogged = new Set<string>()

function logRestFirstPlayerSample(sport: string, raw: unknown) {
  if (restPlayerSampleLogged.has(sport)) return
  restPlayerSampleLogged.add(sport)
  try {
    console.log('[RI REST] first player object', sport, JSON.stringify(raw))
  } catch {
    console.log('[RI REST] first player object', sport, raw)
  }
}

function extractRestRecordArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x))
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const nested = d.data ?? d.Data
    if (Array.isArray(nested)) {
      return nested.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x))
    }
    for (const key of ['players', 'Players', 'teams', 'Teams', 'data', 'results', 'items']) {
      const v = d[key]
      if (Array.isArray(v)) {
        return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x))
      }
    }
  }
  return []
}

async function restGetJson(path: string, rscToken: string): Promise<unknown> {
  const base = getRestBase()
  const url = `${base}/${path.replace(/^\//, '')}?RSC_token=${encodeURIComponent(rscToken)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text()
  if (!res.ok) {
    console.warn(`RI REST ${path} failed: ${res.status} ${text.slice(0, 200)}`)
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    console.warn(`RI REST ${path}: non-JSON response`)
    return null
  }
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function pickPlayerId(p: Record<string, unknown>): string {
  for (const k of ['id', 'player_id', 'PlayerId', 'playerId', 'RI_ID', 'ri_id', 'playerID']) {
    const v = str(p[k])
    if (v) return v
  }
  return ''
}

function pickPlayerName(p: Record<string, unknown>): string {
  for (const k of [
    'full_name',
    'fullName',
    'player',
    'name',
    'PlayerName',
    'player_name',
    'displayName',
    'display_name',
  ]) {
    const v = str(p[k])
    if (v) return v
  }
  return ''
}

function pickPosition(p: Record<string, unknown>): string {
  for (const k of ['position', 'pos', 'Position', 'primary_position']) {
    const v = str(p[k])
    if (v) return v
  }
  return ''
}

function pickHeadshotRest(p: Record<string, unknown>): string {
  for (const k of [
    'headshot_url',
    'HeadshotUrl',
    'headshotUrl',
    'headshot',
    'Headshot',
    'image',
    'img',
    'photo',
    'PhotoUrl',
    'photo_url',
    'picture',
    'PictureUrl',
  ]) {
    const v = p[k]
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim()
  }
  for (const [k, v] of Object.entries(p)) {
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!/^https?:\/\//i.test(t)) continue
    if (/head|shot|photo|image|img|avatar|thumb|picture/i.test(k)) return t
  }
  return ''
}

function mergeTeamFields(p: Record<string, unknown>): Record<string, unknown> {
  const team = p.team
  if (team && typeof team === 'object' && !Array.isArray(team)) {
    return { ...p, ...(team as Record<string, unknown>) }
  }
  return p
}

function pickTeamAbbr(p: Record<string, unknown>): string {
  const m = mergeTeamFields(p)
  for (const k of ['abbrv', 'abbr', 'abbreviation', 'team_abbr', 'teamAbbr', 'TeamAbbr', 'code']) {
    const v = str(m[k])
    if (v && v.length <= 8) return v
  }
  return ''
}

function pickTeamName(p: Record<string, unknown>): string {
  const m = mergeTeamFields(p)
  for (const k of ['team_name', 'teamName', 'team', 'club', 'ClubName', 'name', 'city']) {
    const v = str(m[k])
    if (v && v.length > 1 && !/^https?:/i.test(v)) return v
  }
  return ''
}

function pickTeamImgRest(p: Record<string, unknown>): string {
  const m = mergeTeamFields(p)
  for (const k of ['team_logo', 'logo_url', 'logo', 'img', 'image', 'crest', 'badge']) {
    const v = m[k]
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim()
  }
  return ''
}

function mapRestPlayerRow(raw: Record<string, unknown>, sport: string): RIPlayer | null {
  const id = pickPlayerId(raw)
  const name = pickPlayerName(raw)
  if (!id || !name) return null
  const m = mergeTeamFields(raw)
  return {
    ri_id: id,
    name,
    position: pickPosition(raw),
    team_abbr: pickTeamAbbr(m),
    team_name: pickTeamName(m),
    team_img: pickTeamImgRest(m),
    headshot_url: pickHeadshotRest(raw),
    sport,
  }
}

function pickTeamId(t: Record<string, unknown>): string {
  for (const k of ['id', 'team_id', 'TeamId', 'teamId']) {
    const v = str(t[k])
    if (v) return v
  }
  return ''
}

function pickTeamDisplayName(t: Record<string, unknown>): string {
  for (const k of ['team', 'name', 'full_name', 'club', 'nickname', 'city']) {
    const v = str(t[k])
    if (v) return v
  }
  return ''
}

function pickMascot(t: Record<string, unknown>): string {
  const v = str(t.mascot ?? t.Mascot)
  return v
}

function pickTeamLogoRest(t: Record<string, unknown>): string {
  for (const k of ['img', 'image', 'logo', 'logo_url', 'crest', 'badge', 'photo']) {
    const v = t[k]
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim()
  }
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== 'string') continue
    const s = v.trim()
    if (/^https?:\/\//i.test(s) && /logo|crest|badge|image|img/i.test(k)) return s
  }
  return ''
}

function mapRestTeamRow(raw: Record<string, unknown>, sport: string): RITeam | null {
  const id = pickTeamId(raw)
  if (!id) return null
  const abbr = pickTeamAbbr(raw) || str(raw.code) || str(raw.short_name)
  const name = pickTeamDisplayName(raw)
  return {
    ri_id: id,
    name: name || abbr || id,
    abbr,
    mascot: pickMascot(raw),
    logo_url: pickTeamLogoRest(raw),
    sport,
  }
}

async function fetchRESTPlayersForSport(sport: string): Promise<RIPlayer[]> {
  const token = getRscTokenSet2()
  if (!token) {
    console.warn('RI REST: missing ROLLING_INSIGHTS_CLIENT_ID2 (RSC_token)')
    return []
  }

  let pathSport = sport
  let data = await restGetJson(`players/${pathSport}`, token)
  let rows = extractRestRecordArray(data)

  if (sport === 'SOCCER' && rows.length === 0) {
    data = await restGetJson('players/EPL', token)
    rows = extractRestRecordArray(data)
    pathSport = 'EPL(fallback)'
  }

  if (rows.length > 0) logRestFirstPlayerSample(sport, rows[0])

  return rows.map((r) => mapRestPlayerRow(r, sport)).filter((p): p is RIPlayer => p !== null)
}

async function fetchRESTTeamsForSport(sport: string): Promise<RITeam[]> {
  const token = getRscTokenSet2()
  if (!token) return []

  let data = await restGetJson(`teams/${sport}`, token)
  let rows = extractRestRecordArray(data)

  if (sport === 'SOCCER' && rows.length === 0) {
    data = await restGetJson('teams/EPL', token)
    rows = extractRestRecordArray(data)
  }

  return rows.map((r) => mapRestTeamRow(r, sport)).filter((t): t is RITeam => t !== null)
}

async function fetchGraphQLPlayers(sport: string): Promise<RIPlayer[]> {
  const s = sport.toUpperCase()
  const queryMap = SPORT_QUERY_MAP[s]
  if (!queryMap) return []

  const { clientId, clientSecret } = getGraphQLCredentials(s)
  if (!clientId || !clientSecret) {
    console.warn(`RI GraphQL: no credentials for ${s}`)
    return []
  }

  const season = getCurrentSeason()
  const query = `{
    ${queryMap.roster}(season: "${season}") {
      id
      player
      position
      img
      status
      team {
        id
        team
        abbrv
        mascot
        img
      }
    }
  }`

  try {
    const data = (await riQuery(query, clientId, clientSecret)) as Record<string, unknown>
    const rows = (data?.[queryMap.roster] as unknown[]) ?? []

    return rows
      .map((r: unknown) => {
        const p = r as Record<string, unknown>
        const team = (p.team ?? {}) as Record<string, unknown>
        const rawImg = p.img
        return {
          ri_id: String(p.id ?? ''),
          name: String(p.player ?? ''),
          position: String(p.position ?? ''),
          team_abbr: String(team.abbrv ?? ''),
          team_name: String(team.team ?? ''),
          team_img: graphqlTeamImgToUrl(team.img),
          headshot_url: graphqlPlayerImgToHeadshotUrl(rawImg),
          sport: s,
        }
      })
      .filter((p) => p.ri_id && p.name)
  } catch (err) {
    console.error(`RI fetchGraphQLPlayers(${s}) failed:`, err)
    return []
  }
}

async function fetchGraphQLTeams(sport: string): Promise<RITeam[]> {
  const s = sport.toUpperCase()
  const queryMap = SPORT_QUERY_MAP[s]
  if (!queryMap) return []

  const { clientId, clientSecret } = getGraphQLCredentials(s)
  if (!clientId || !clientSecret) return []

  const query = `{
    ${queryMap.teams} {
      id
      team
      abbrv
      mascot
      img
    }
  }`

  try {
    const data = (await riQuery(query, clientId, clientSecret)) as Record<string, unknown>
    const rows = (data?.[queryMap.teams] as unknown[]) ?? []

    return rows
      .map((r: unknown) => {
        const t = r as Record<string, unknown>
        return {
          ri_id: String(t.id ?? ''),
          name: String(t.team ?? ''),
          abbr: String(t.abbrv ?? ''),
          mascot: String(t.mascot ?? ''),
          logo_url: graphqlTeamImgToUrl(t.img),
          sport: s,
        }
      })
      .filter((t) => t.ri_id)
  } catch (err) {
    console.error(`RI fetchGraphQLTeams(${s}) failed:`, err)
    return []
  }
}

export async function fetchRIPlayers(sport: string): Promise<RIPlayer[]> {
  const s = sport.toUpperCase()
  if (GRAPHQL_SPORTS.has(s)) return fetchGraphQLPlayers(s)
  if (REST_SPORTS.has(s)) return fetchRESTPlayersForSport(s)
  throw new Error(`Unsupported RI sport: ${sport}`)
}

export async function fetchRITeams(sport: string): Promise<RITeam[]> {
  const s = sport.toUpperCase()
  if (GRAPHQL_SPORTS.has(s)) return fetchGraphQLTeams(s)
  if (REST_SPORTS.has(s)) return fetchRESTTeamsForSport(s)
  return []
}

export async function buildRIPlayerMap(sport: string): Promise<Record<string, RIPlayer>> {
  const players = await fetchRIPlayers(sport)
  return Object.fromEntries(players.map((p) => [p.ri_id, p]))
}

function riPlayersToLegacyMap(players: RIPlayer[]): RiPlayerMap {
  const out: RiPlayerMap = {}
  for (const p of players) {
    out[p.ri_id] = {
      name: p.name,
      headshot_url: p.headshot_url || null,
      position: p.position,
      team: p.team_abbr || 'FA',
    }
  }
  return out
}

/** Uncached legacy map — used by sync route + cache bust. */
export async function fetchRiPlayersUncached(sport: string): Promise<RiPlayerMap> {
  const players = await fetchRIPlayers(sport)
  return riPlayersToLegacyMap(players)
}

type CachedFn = () => Promise<RIPlayer[]>

const riPlayersCacheBySport = new Map<string, CachedFn>()

function getCachedRIPlayersFn(sport: string): CachedFn {
  const key = sport.toUpperCase()
  let fn = riPlayersCacheBySport.get(key)
  if (!fn) {
    const tag = `ri-players-${key.toLowerCase()}`
    fn = unstable_cache(
      async () => fetchRIPlayers(key),
      ['ri-players-mixed', key],
      { revalidate: 86400, tags: [tag] }
    )
    riPlayersCacheBySport.set(key, fn)
  }
  return fn
}

/** Cached RI players (24h) — per-sport revalidateTag(`ri-players-${sport}`). */
export async function getCachedRIPlayersList(sport: string): Promise<RIPlayer[]> {
  return getCachedRIPlayersFn(sport)()
}

export const getCachedRiPlayerMap = async (sport: string): Promise<RiPlayerMap> => {
  const players = await getCachedRIPlayersList(sport)
  return riPlayersToLegacyMap(players)
}
