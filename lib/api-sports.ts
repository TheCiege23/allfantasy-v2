import { prisma } from './prisma';
import { normalizeTeamAbbrev, normalizePosition, normalizePlayerName } from './team-abbrev';
import { rateLimitManager } from '@/lib/workers/rate-limit-manager'
import {
  shouldIncludeInjuryInFanoutBatch,
  type InjurySyncFanoutRow,
} from '@/lib/realtime-events/injuryFanoutPolicy'

const BASE_URL = 'https://v1.american-football.api-sports.io';

export interface ProviderCallDiagnostic {
  provider: 'api_sports'
  endpoint: string
  params: Record<string, string>
  url: string
  status: number | null
  ok: boolean
  error: string | null
  at: string
}

const apiSportsDiagnostics: ProviderCallDiagnostic[] = []
const MAX_DIAGNOSTIC_ROWS = 100

function pushApiSportsDiagnostic(row: ProviderCallDiagnostic) {
  apiSportsDiagnostics.push(row)
  if (apiSportsDiagnostics.length > MAX_DIAGNOSTIC_ROWS) {
    apiSportsDiagnostics.splice(0, apiSportsDiagnostics.length - MAX_DIAGNOSTIC_ROWS)
  }
}

export function clearAPISportsDiagnostics() {
  apiSportsDiagnostics.length = 0
}

export function getAPISportsDiagnostics(): ProviderCallDiagnostic[] {
  return apiSportsDiagnostics.map((row) => ({ ...row, params: { ...row.params } }))
}

const API_SPORTS_TEAM_MAP: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
};

export function teamNameToAbbrev(name: string | null): string | null {
  if (!name) return null;
  return normalizeTeamAbbrev(API_SPORTS_TEAM_MAP[name]) || normalizeTeamAbbrev(name) || null;
}

let ipBlockedUntil = 0;
const IP_BLOCK_COOLDOWN_MS = 60 * 60 * 1000;

let minuteRateLimitResetAt = 0;

let requestQueue: Promise<unknown> = Promise.resolve();

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  const queued = requestQueue.then(() => fn(), () => fn());
  requestQueue = queued.then(() => {}, () => {});
  return queued;
}

async function apiSportsFetchInternal<T>(endpoint: string, params?: Record<string, string>, opts?: { bypassRateGuard?: boolean }): Promise<T> {
  const apiKey = process.env.APISPORTS_API_KEY || process.env.API_SPORTS_KEY;
  if (!apiKey) {
    throw new Error('APISPORTS_API_KEY not configured');
  }

  if (!opts?.bypassRateGuard && !(await rateLimitManager.canCall('api_sports', endpoint))) {
    await rateLimitManager.recordCall('api_sports', endpoint, 429, 0, { cached: true, error: 'rate_limit_guard' })
    const fallbackType = endpoint.includes('injur')
      ? 'injuries'
      : endpoint.includes('game')
        ? 'schedule'
        : endpoint.includes('player')
          ? 'players'
          : 'players'
    return await rateLimitManager.getFallback('api_sports', fallbackType) as T
  }

  if (Date.now() < ipBlockedUntil) {
    throw new Error('API-Sports IP blocked — skipping until cooldown expires');
  }

  if (Date.now() < minuteRateLimitResetAt) {
    const waitMs = minuteRateLimitResetAt - Date.now();
    console.log(`[API-Sports] Rate limit active, waiting ${Math.ceil(waitMs / 1000)}s`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  const paramCopy: Record<string, string> = {}
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url.searchParams.set(k, v)
      paramCopy[k] = v
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      await rateLimitManager.recordCall('api_sports', endpoint, response.status, 0, { error: response.statusText })
      pushApiSportsDiagnostic({
        provider: 'api_sports',
        endpoint,
        params: paramCopy,
        url: url.toString(),
        status: response.status,
        ok: false,
        error: `HTTP ${response.status} ${response.statusText}`,
        at: new Date().toISOString(),
      })
      throw new Error(`API-Sports request failed: ${response.status} ${response.statusText}`);
    }

    const remaining = response.headers.get('x-ratelimit-requests-remaining');
    if (remaining && parseInt(remaining) < 5) {
      console.warn(`[API-Sports] Low daily quota: ${remaining} requests remaining`);
    }

    const minuteRemaining = response.headers.get('X-RateLimit-Remaining');
    if (minuteRemaining) {
      const rem = parseInt(minuteRemaining);
      if (rem < 2) {
        minuteRateLimitResetAt = Date.now() + 62_000;
        console.warn(`[API-Sports] Per-minute rate limit nearly hit: ${rem} remaining, pausing new requests for 62s`);
      } else if (rem < 5) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    const result = await response.json();
    await rateLimitManager.recordCall('api_sports', endpoint, response.status, 0)

    if (result.errors && Object.keys(result.errors).length > 0) {
      const errStr = JSON.stringify(result.errors);
      pushApiSportsDiagnostic({
        provider: 'api_sports',
        endpoint,
        params: paramCopy,
        url: url.toString(),
        status: response.status,
        ok: false,
        error: errStr,
        at: new Date().toISOString(),
      })
      if (errStr.includes('IP is not allowed')) {
        console.warn('[API-Sports] IP blocked by API-Sports. Pausing requests for 1 hour.');
        ipBlockedUntil = Date.now() + IP_BLOCK_COOLDOWN_MS;
      }
      throw new Error(`API-Sports error: ${errStr}`);
    }

    pushApiSportsDiagnostic({
      provider: 'api_sports',
      endpoint,
      params: paramCopy,
      url: url.toString(),
      status: response.status,
      ok: true,
      error: null,
      at: new Date().toISOString(),
    })

    return result.response as T;
  } catch (error) {
    clearTimeout(timeout);
    pushApiSportsDiagnostic({
      provider: 'api_sports',
      endpoint,
      params: paramCopy,
      url: url.toString(),
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    })
    await rateLimitManager.recordCall('api_sports', endpoint, 500, 0, {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error;
  }
}

async function apiSportsFetch<T>(endpoint: string, params?: Record<string, string>, opts?: { bypassRateGuard?: boolean }): Promise<T> {
  return enqueueRequest(() => apiSportsFetchInternal<T>(endpoint, params, opts));
}

export interface APISportsTeam {
  id: number;
  name: string;
  logo: string | null;
  city: string | null;
  coach: string | null;
  owner: string | null;
  stadium: string | null;
  established: number | null;
}

export interface APISportsPlayer {
  id: number;
  name: string;
  age: number | null;
  height: string | null;
  weight: string | null;
  college: string | null;
  group: string | null;
  position: string | null;
  number: number | null;
  salary: string | null;
  experience: string | null;
  image: string | null;
  team: {
    id: number;
    name: string;
    logo: string | null;
  } | null;
}

export interface APISportsInjury {
  id: number;
  player: {
    id: number;
    name: string;
    image: string | null;
  };
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  status: string | null;
  date: string | null;
  description: string | null;
  type: string | null;
}

export interface APISportsGame {
  game: {
    id: number;
    stage: string | null;
    week: string | null;
    date: {
      date: string | null;
      time: string | null;
      timestamp: number | null;
    };
    venue: {
      name: string | null;
      city: string | null;
    } | null;
    status: {
      short: string | null;
      long: string | null;
    };
  };
  league: {
    id: number;
    name: string;
    season: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
}

export interface APISportsStanding {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  position: number;
  won: number;
  lost: number;
  tied: number;
  points: { for: number; against: number };
  group: {
    name: string;
    conference: string | null;
  };
}

export async function fetchAPISportsTeams(season?: string): Promise<APISportsTeam[]> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports()
  const data = await apiSportsFetch<APISportsTeam[]>('teams', {
    league: '1',
    season: currentSeason,
  });
  return data || [];
}

export async function fetchAPISportsPlayers(teamId: string, season: string): Promise<APISportsPlayer[]> {
  const data = await apiSportsFetch<APISportsPlayer[]>('players', {
    team: teamId,
    season,
  });
  return data || [];
}

/**
 * E.1.6 — API-Sports `/players?search=NAME` for NFL.
 *
 * Bug fixes vs. the previous implementation:
 *   - Removed `league: '1'` — the NFL endpoint rejects this param ("The League
 *     field do not exist.").
 *   - Removed `season` — passing season silently makes API-Sports require a
 *     `team` numeric id, which we don't have at this call site. The bare
 *     `?search=NAME` form returns up to 9 candidates without that constraint.
 *   - Sanitizes the search string to alphanumeric + space before sending —
 *     the API rejects apostrophes/periods ("The Search field may only contain
 *     alpha-numeric characters and spaces."), which was causing every
 *     punctuation-outlier lookup (Ja'Marr Chase, A.J. Brown, …) to 400-error.
 *
 * The `season` parameter is accepted for backward compatibility but ignored.
 */
export async function fetchAPISportsPlayerBySearch(search: string, _season?: string): Promise<APISportsPlayer[]> {
  const sanitized = (search ?? '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return [];
  // E.1.6 — bypass the rate-limit fallback (which returns synthetic "Juan Cabada"
  // test rows) so headshot lookups always hit the real API. Headshot backfills
  // are low-volume by nature — at most a few hundred lookups per run — so the
  // budget impact is negligible and a synthetic fallback would silently corrupt
  // every player's resolved image.
  const data = await apiSportsFetch<APISportsPlayer[]>(
    'players',
    { search: sanitized },
    { bypassRateGuard: true },
  );
  return data || [];
}

export async function fetchAPISportsInjuries(season: string): Promise<APISportsInjury[]> {
  const attempts: Array<Record<string, string> | undefined> = [
    { season },
    undefined,
  ]

  let lastError: unknown = null
  for (const params of attempts) {
    try {
      const data = await apiSportsFetch<APISportsInjury[]>('injuries', params)
      return data || []
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch API-Sports injuries')
}

export async function fetchAPISportsInjuriesByTeam(teamId: string, season: string): Promise<APISportsInjury[]> {
  const attempts: Array<Record<string, string>> = [
    { team: teamId, season },
    { team: teamId },
  ]

  let lastError: unknown = null
  for (const params of attempts) {
    try {
      const data = await apiSportsFetch<APISportsInjury[]>('injuries', params, { bypassRateGuard: true })
      return data || []
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch API-Sports injuries by team')
}

async function fetchAPISportsInjuriesViaTeamFanout(season: string): Promise<APISportsInjury[]> {
  let teams: APISportsTeam[] = []
  try {
    teams = await fetchAPISportsTeams(season)
  } catch {
    teams = await fetchAPISportsTeams()
  }

  if (teams.length === 0) return []

  const byId = new Map<string, APISportsInjury>()
  for (const team of teams) {
    try {
      const injuries = await fetchAPISportsInjuriesByTeam(String(team.id), season)
      for (const [index, injury] of injuries.entries()) {
        const row = injury as APISportsInjury & Record<string, unknown>
        const playerId = row.player?.id ?? (row.player_id as number | string | undefined) ?? ''
        const playerName = row.player?.name ?? (row.player_name as string | undefined) ?? ''
        const injuryDate = row.date ?? (row.updated as string | undefined) ?? ''
        const dedupeKey = row.id != null
          ? `id:${String(row.id)}`
          : `team:${team.id}:player:${String(playerId)}:${String(playerName).trim().toLowerCase()}:date:${String(injuryDate)}:i:${index}`

        if (!byId.has(dedupeKey)) byId.set(dedupeKey, injury)
      }
    } catch {
      continue
    }
  }

  return [...byId.values()]
}

export async function fetchAPISportsGames(season: string): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    league: '1',
    season,
  });
  return data || [];
}

export async function fetchAPISportsGamesByWeek(season: string, week: string): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    league: '1',
    season,
    week,
  });
  return data || [];
}

export async function fetchAPISportsLiveGames(): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    league: '1',
    live: 'all',
  });
  return data || [];
}

export async function fetchAPISportsStandings(season: string, opts?: { conference?: string; division?: string }): Promise<APISportsStanding[]> {
  const params: Record<string, string> = { league: '1', season };
  if (opts?.conference) params.conference = opts.conference;
  if (opts?.division) params.division = opts.division;
  const data = await apiSportsFetch<APISportsStanding[]>('standings', params);
  return data || [];
}

export interface APISportsConference {
  id: number;
  name: string;
  league: { id: number; name: string; season: string };
}

export interface APISportsDivision {
  id: number;
  name: string;
  conference: { id: number; name: string };
  league: { id: number; name: string; season: string };
}

export async function fetchAPISportsConferences(season: string): Promise<APISportsConference[]> {
  const data = await apiSportsFetch<APISportsConference[]>('standings/conferences', {
    league: '1',
    season,
  });
  return data || [];
}

export async function fetchAPISportsDivisions(season: string): Promise<APISportsDivision[]> {
  const data = await apiSportsFetch<APISportsDivision[]>('standings/divisions', {
    league: '1',
    season,
  });
  return data || [];
}

export interface APISportsPlayerStatistics {
  player: { id: number; name: string; image: string | null };
  teams: Array<{
    team: { id: number; name: string; logo: string | null };
    groups: Array<{
      name: string;
      statistics: Array<{ name: string; value: string | number | null }>;
    }>;
  }>;
}

export async function fetchAPISportsPlayerStatistics(playerId: string, season: string): Promise<APISportsPlayerStatistics[]> {
  const data = await apiSportsFetch<APISportsPlayerStatistics[]>('players/statistics', {
    id: playerId,
    season,
  });
  return data || [];
}

export interface APISportsGameEvent {
  quarter: number | null;
  minute: string | null;
  team: { id: number; name: string; logo: string | null } | null;
  player: { id: number; name: string } | null;
  type: string | null;
  comment: string | null;
}

export async function fetchAPISportsGameEvents(gameId: string): Promise<APISportsGameEvent[]> {
  const data = await apiSportsFetch<APISportsGameEvent[]>('games/events', {
    id: gameId,
  });
  return data || [];
}

export interface APISportsGameTeamStats {
  team: { id: number; name: string; logo: string | null };
  statistics: Array<{ name: string; value: string | number | null }>;
}

export async function fetchAPISportsGameTeamStats(gameId: string): Promise<APISportsGameTeamStats[]> {
  const data = await apiSportsFetch<APISportsGameTeamStats[]>('games/statistics/teams', {
    id: gameId,
  });
  return data || [];
}

export interface APISportsGamePlayerStats {
  team: { id: number; name: string; logo: string | null };
  groups: Array<{
    name: string;
    players: Array<{
      player: { id: number; name: string };
      statistics: Array<{ name: string; value: string | number | null }>;
    }>;
  }>;
}

export async function fetchAPISportsGamePlayerStats(gameId: string): Promise<APISportsGamePlayerStats[]> {
  const data = await apiSportsFetch<APISportsGamePlayerStats[]>('games/statistics/players', {
    id: gameId,
  });
  return data || [];
}

export interface APISportsOdds {
  league: { id: number; name: string; season: string };
  game: { id: number; date: string };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

export async function fetchAPISportsOdds(gameId: string): Promise<APISportsOdds[]> {
  const data = await apiSportsFetch<APISportsOdds[]>('odds', {
    game: gameId,
  });
  return data || [];
}

export async function fetchAPISportsOddsBySeasonWeek(season: string, opts?: { bookmaker?: string }): Promise<APISportsOdds[]> {
  const params: Record<string, string> = { league: '1', season };
  if (opts?.bookmaker) params.bookmaker = opts.bookmaker;
  const data = await apiSportsFetch<APISportsOdds[]>('odds', params);
  return data || [];
}

export interface APISportsBookmaker {
  id: number;
  name: string;
}

export async function fetchAPISportsBookmakers(): Promise<APISportsBookmaker[]> {
  const data = await apiSportsFetch<APISportsBookmaker[]>('odds/bookmakers');
  return data || [];
}

export interface APISportsBetType {
  id: number;
  name: string;
}

export async function fetchAPISportsBetTypes(): Promise<APISportsBetType[]> {
  const data = await apiSportsFetch<APISportsBetType[]>('odds/bets');
  return data || [];
}

export interface APISportsLeague {
  id: number;
  name: string;
  season: string | null;
  logo: string | null;
  country: { name: string; code: string | null; flag: string | null } | null;
}

export async function fetchAPISportsLeagues(): Promise<APISportsLeague[]> {
  const data = await apiSportsFetch<APISportsLeague[]>('leagues');
  return data || [];
}

export async function fetchAPISportsSeasons(): Promise<number[]> {
  const data = await apiSportsFetch<number[]>('seasons');
  return data || [];
}

export async function fetchAPISportsTimezones(): Promise<string[]> {
  const data = await apiSportsFetch<string[]>('timezone');
  return data || [];
}

export async function fetchAPISportsGamesByDate(date: string): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    league: '1',
    date,
  });
  return data || [];
}

export async function fetchAPISportsH2H(team1Id: string, team2Id: string): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    h2h: `${team1Id}-${team2Id}`,
  });
  return data || [];
}

export async function fetchAPISportsGamesByTeam(teamId: string, season: string): Promise<APISportsGame[]> {
  const data = await apiSportsFetch<APISportsGame[]>('games', {
    league: '1',
    season,
    team: teamId,
  });
  return data || [];
}

export function getCurrentNFLSeasonForAPISports(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? String(year) : String(year - 1);
}

export async function syncAPISportsInjuriesToDb(season?: string): Promise<number> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports();
  let injuries: APISportsInjury[] = [];

  try {
    // The API-Sports NFL injuries endpoint is reliable only with team-based queries.
    injuries = await fetchAPISportsInjuriesViaTeamFanout(currentSeason)
  } catch (error) {
    console.error('[API-Sports] Team-fanout injuries fetch failed:', error)
    return 0
  }

  let synced = 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const fanoutByPlayer = new Map<string, InjurySyncFanoutRow>();

  for (const [index, injury] of injuries.entries()) {
    const row = injury as APISportsInjury & Record<string, unknown>
    const playerIdRaw = row.player?.id ?? (row.player_id as number | string | undefined) ?? null
    const playerNameRaw = row.player?.name ?? (row.player_name as string | undefined) ?? (row.name as string | undefined) ?? null
    const teamIdRaw = row.team?.id ?? (row.team_id as number | string | undefined) ?? null
    const teamNameRaw = row.team?.name ?? (row.team_name as string | undefined) ?? null
    const typeRaw = row.type ?? (row.injury as string | null | undefined) ?? null
    const statusRaw = row.status ?? (row.state as string | null | undefined) ?? null
    const descriptionRaw = row.description ?? (row.details as string | null | undefined) ?? null
    const dateRaw = row.date ?? (row.updated as string | null | undefined) ?? null

    if (!playerIdRaw && !playerNameRaw) {
      continue
    }

    const playerId = playerIdRaw != null ? String(playerIdRaw) : null
    const playerName = (playerNameRaw || '').trim() || `Unknown ${playerId || 'player'}`
    const teamId = teamIdRaw != null ? String(teamIdRaw) : null
    const team = teamNameToAbbrev(teamNameRaw || null)
    const externalId = row.id != null
      ? String(row.id)
      : `${playerId || 'p'}:${teamId || 't'}:${dateRaw || 'd'}:${index}`
    const parsedDate = dateRaw ? new Date(String(dateRaw)) : null
    const safeDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null

    try {
      await prisma.sportsInjury.upsert({
        where: {
          sport_externalId_source: {
            sport: 'NFL',
            externalId,
            source: 'api_sports',
          },
        },
        update: {
          playerName,
          playerId,
          team,
          teamId,
          type: typeRaw,
          status: statusRaw,
          description: descriptionRaw,
          date: safeDate,
          season: parseInt(currentSeason),
          fetchedAt: now,
          expiresAt,
        },
        create: {
          sport: 'NFL',
          externalId,
          playerName,
          playerId,
          team,
          teamId,
          type: typeRaw,
          status: statusRaw,
          description: descriptionRaw,
          date: safeDate,
          season: parseInt(currentSeason),
          source: 'api_sports',
          fetchedAt: now,
          expiresAt,
        },
      });
      synced++;
      if (shouldIncludeInjuryInFanoutBatch(statusRaw)) {
        const k = playerName.trim().toLowerCase();
        if (k) {
          fanoutByPlayer.set(k, {
            playerName,
            team,
            status: statusRaw ?? '',
            type: typeRaw ?? null,
            description: descriptionRaw ?? null,
          });
        }
      }
    } catch (err) {
      console.error(`[API-Sports] Failed to sync injury for ${playerName}:`, err);
    }
  }

  console.log(`[API-Sports] Synced ${synced}/${injuries.length} injuries`);
  if (fanoutByPlayer.size > 0) {
    const injuriesPayload = [...fanoutByPlayer.values()];
    void import('@/lib/realtime-events/injurySyncFanout')
      .then((m) => m.fanoutInjurySyncBatch({ sport: 'NFL', injuries: injuriesPayload }))
      .catch(() => {});
  }
  return synced;
}

export async function syncAPISportsTeamsToDb(season?: string): Promise<number> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports()
  let teams: APISportsTeam[];

  try {
    teams = await fetchAPISportsTeams(currentSeason);
  } catch (error) {
    console.error('[API-Sports] Failed to fetch teams:', error);
    return 0;
  }

  let synced = 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const team of teams) {
    const abbrev = teamNameToAbbrev(team.name);

    try {
      await prisma.sportsTeam.upsert({
        where: {
          sport_externalId_source: {
            sport: 'NFL',
            externalId: String(team.id),
            source: 'api_sports',
          },
        },
        update: {
          name: team.name,
          shortName: abbrev,
          city: team.city,
          logo: team.logo,
          fetchedAt: now,
          expiresAt,
        },
        create: {
          sport: 'NFL',
          externalId: String(team.id),
          name: team.name,
          shortName: abbrev,
          city: team.city,
          logo: team.logo,
          source: 'api_sports',
          fetchedAt: now,
          expiresAt,
        },
      });
      synced++;
    } catch (err) {
      console.error(`[API-Sports] Failed to sync team ${team.name}:`, err);
    }
  }

  console.log(`[API-Sports] Synced ${synced}/${teams.length} teams`);
  return synced;
}

export async function syncAPISportsGamesToDb(season?: string): Promise<number> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports();
  let games: APISportsGame[];

  try {
    games = await fetchAPISportsGames(currentSeason);
  } catch (error) {
    console.error('[API-Sports] Failed to fetch games:', error);
    return 0;
  }

  let synced = 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 1000);

  for (const g of games) {
    const homeTeam = teamNameToAbbrev(g.teams.home.name) || g.teams.home.name;
    const awayTeam = teamNameToAbbrev(g.teams.away.name) || g.teams.away.name;
    const weekNum = g.game.week ? parseInt(g.game.week.replace(/\D/g, '')) || null : null;

    try {
      await prisma.sportsGame.upsert({
        where: {
          sport_externalId_source: {
            sport: 'NFL',
            externalId: String(g.game.id),
            source: 'api_sports',
          },
        },
        update: {
          homeTeam,
          awayTeam,
          homeTeamId: String(g.teams.home.id),
          awayTeamId: String(g.teams.away.id),
          homeScore: g.scores.home.total,
          awayScore: g.scores.away.total,
          status: g.game.status.long,
          startTime: g.game.date.timestamp ? new Date(g.game.date.timestamp * 1000) : null,
          venue: g.game.venue?.name || null,
          week: weekNum,
          season: g.league.season ? parseInt(g.league.season) : null,
          fetchedAt: now,
          expiresAt,
        },
        create: {
          sport: 'NFL',
          externalId: String(g.game.id),
          homeTeam,
          awayTeam,
          homeTeamId: String(g.teams.home.id),
          awayTeamId: String(g.teams.away.id),
          homeScore: g.scores.home.total,
          awayScore: g.scores.away.total,
          status: g.game.status.long,
          startTime: g.game.date.timestamp ? new Date(g.game.date.timestamp * 1000) : null,
          venue: g.game.venue?.name || null,
          week: weekNum,
          season: g.league.season ? parseInt(g.league.season) : null,
          source: 'api_sports',
          fetchedAt: now,
          expiresAt,
        },
      });
      synced++;
    } catch (err) {
      console.error(`[API-Sports] Failed to sync game ${g.game.id}:`, err);
    }
  }

  console.log(`[API-Sports] Synced ${synced}/${games.length} games`);
  return synced;
}

export async function syncAPISportsPlayersToIdentityMap(season?: string): Promise<{ linked: number; created: number }> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports();
  let linked = 0;
  let created = 0;

  const teams = await prisma.sportsTeam.findMany({
    where: { sport: 'NFL', source: 'api_sports' },
    select: { externalId: true, shortName: true, name: true },
  });

  const BATCH_SIZE = 4;
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = teams.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (team) => {
        let players: APISportsPlayer[];
        try {
          players = await fetchAPISportsPlayers(team.externalId, currentSeason);
        } catch (err) {
          console.error(`[API-Sports] Failed to fetch players for ${team.name}:`, err);
          return { linked: 0, created: 0 };
        }

        let batchLinked = 0;
        let batchCreated = 0;

        for (const p of players) {
          const normalizedName = normalizePlayerName(p.name);
          const position = normalizePosition(p.position || p.group);
          const teamAbbrev = teamNameToAbbrev(p.team?.name || team.name);

          const candidates = await prisma.playerIdentityMap.findMany({
            where: { normalizedName, sport: 'NFL' },
          });

          if (candidates.length === 1) {
            await prisma.playerIdentityMap.update({
              where: { id: candidates[0].id },
              data: {
                apiSportsId: String(p.id),
                lastSyncedAt: new Date(),
              },
            });
            batchLinked++;
          } else if (candidates.length > 1) {
            const match = candidates.find((c: { position: string | null; currentTeam: string | null }) => {
              const posMatch = !position || !c.position || normalizePosition(c.position) === position;
              const teamMatch = !teamAbbrev || !c.currentTeam || normalizeTeamAbbrev(c.currentTeam) === teamAbbrev;
              return posMatch && teamMatch;
            });
            if (match) {
              await prisma.playerIdentityMap.update({
                where: { id: match.id },
                data: {
                  apiSportsId: String(p.id),
                  lastSyncedAt: new Date(),
                },
              });
              batchLinked++;
            }
          } else {
            await prisma.playerIdentityMap.create({
              data: {
                canonicalName: p.name,
                normalizedName,
                position,
                currentTeam: teamAbbrev,
                apiSportsId: String(p.id),
                sport: 'NFL',
                lastSyncedAt: new Date(),
              },
            });
            batchCreated++;
          }
        }

        return { linked: batchLinked, created: batchCreated };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        linked += result.value.linked;
        created += result.value.created;
      }
    }
  }

  console.log(`[API-Sports] Identity sync: ${linked} linked, ${created} created`);
  return { linked, created };
}

export async function syncAPISportsStandingsToDb(season?: string): Promise<number> {
  const currentSeason = season || getCurrentNFLSeasonForAPISports();
  let standings: APISportsStanding[];

  try {
    standings = await fetchAPISportsStandings(currentSeason);
  } catch (error) {
    console.error('[API-Sports] Failed to fetch standings:', error);
    return 0;
  }

  let synced = 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  for (const s of standings) {
    const teamAbbrev = teamNameToAbbrev(s.team.name) || s.team.name;

    try {
      const cacheKey = `NFL:standings:${currentSeason}:${teamAbbrev}`;
      await (prisma.sportsDataCache as any).upsert({
        where: { cacheKey },
        update: {
          data: {
            team: teamAbbrev,
            teamName: s.team.name,
            logo: s.team.logo,
            position: s.position,
            won: s.won,
            lost: s.lost,
            tied: s.tied,
            pointsFor: s.points.for,
            pointsAgainst: s.points.against,
            conference: s.group?.conference || null,
            division: s.group?.name || null,
            season: currentSeason,
          } as object,
          expiresAt,
        },
        create: {
          cacheKey,
          data: {
            team: teamAbbrev,
            teamName: s.team.name,
            logo: s.team.logo,
            position: s.position,
            won: s.won,
            lost: s.lost,
            tied: s.tied,
            pointsFor: s.points.for,
            pointsAgainst: s.points.against,
            conference: s.group?.conference || null,
            division: s.group?.name || null,
            season: currentSeason,
          } as object,
          expiresAt,
        },
      });
      synced++;
    } catch (err) {
      console.error(`[API-Sports] Failed to sync standing for ${s.team.name}:`, err);
    }
  }

  console.log(`[API-Sports] Synced ${synced}/${standings.length} standings`);
  return synced;
}

export async function getAPISportsGameDetail(gameId: string): Promise<{
  events: APISportsGameEvent[];
  teamStats: APISportsGameTeamStats[];
  playerStats: APISportsGamePlayerStats[];
}> {
  const [events, teamStats, playerStats] = await Promise.all([
    fetchAPISportsGameEvents(gameId).catch(() => [] as APISportsGameEvent[]),
    fetchAPISportsGameTeamStats(gameId).catch(() => [] as APISportsGameTeamStats[]),
    fetchAPISportsGamePlayerStats(gameId).catch(() => [] as APISportsGamePlayerStats[]),
  ]);

  return { events, teamStats, playerStats };
}
