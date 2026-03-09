import type {
  DraftWarRoomData,
  GetDraftWarRoomQuery,
  GetOffseasonDashboardQuery,
  GetTradeCommandCenterQuery,
  LegacyApiResponse,
  MarketRefreshData,
  OffseasonDashboardData,
  PostDraftRecommendationRefreshBody,
  PostMarketRefreshBody,
  PostTeamDirectionRefreshBody,
  PostTradeReviewBody,
  TeamDirectionRefreshData,
  TradeCommandCenterData,
  TradeReviewData,
} from '@/types/legacy'

const LEGACY_API_BASE = '/api/legacy'

async function parseLegacyResponse<T>(res: Response): Promise<LegacyApiResponse<T>> {
  const data = (await res.json()) as LegacyApiResponse<T>
  return data
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    sp.set(key, String(value))
  }
  return sp.toString()
}

export async function getOffseasonDashboard(
  query: GetOffseasonDashboardQuery,
): Promise<LegacyApiResponse<OffseasonDashboardData>> {
  const qs = buildQuery({
    leagueId: query.leagueId,
    userId: query.userId,
    includeLiveNews: Boolean(query.includeLiveNews),
    includeMarketBoard: Boolean(query.includeMarketBoard),
    includeWatchlists: Boolean(query.includeWatchlists),
  })

  const res = await fetch(`${LEGACY_API_BASE}/offseason-dashboard?${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  return parseLegacyResponse<OffseasonDashboardData>(res)
}

export async function getDraftWarRoom(
  query: GetDraftWarRoomQuery,
): Promise<LegacyApiResponse<DraftWarRoomData>> {
  const qs = buildQuery({
    leagueId: query.leagueId,
    userId: query.userId,
    draftId: query.draftId,
    overallPick: query.overallPick,
    round: query.round,
    includeSimulation: Boolean(query.includeSimulation),
    includePredictedPicksAhead: Boolean(query.includePredictedPicksAhead),
  })

  const res = await fetch(`${LEGACY_API_BASE}/draft-war-room?${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  return parseLegacyResponse<DraftWarRoomData>(res)
}

export async function getTradeCommandCenter(
  query: GetTradeCommandCenterQuery,
): Promise<LegacyApiResponse<TradeCommandCenterData>> {
  const qs = buildQuery({
    leagueId: query.leagueId,
    userId: query.userId,
    includeIncomingOffers: Boolean(query.includeIncomingOffers),
    includeSentOffers: Boolean(query.includeSentOffers),
    includeExpiredOffers: Boolean(query.includeExpiredOffers),
    includeOfferBuilder: Boolean(query.includeOfferBuilder),
  })

  const res = await fetch(`${LEGACY_API_BASE}/trade-command-center?${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  return parseLegacyResponse<TradeCommandCenterData>(res)
}

export async function postTradeReview(
  body: PostTradeReviewBody,
): Promise<LegacyApiResponse<TradeReviewData>> {
  const res = await fetch(`${LEGACY_API_BASE}/trade/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  return parseLegacyResponse<TradeReviewData>(res)
}

export async function postDraftRecommendationRefresh(
  body: PostDraftRecommendationRefreshBody,
): Promise<LegacyApiResponse<DraftWarRoomData>> {
  const res = await fetch(`${LEGACY_API_BASE}/draft/recommendation-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  return parseLegacyResponse<DraftWarRoomData>(res)
}

export async function postTeamDirectionRefresh(
  body: PostTeamDirectionRefreshBody,
): Promise<LegacyApiResponse<TeamDirectionRefreshData>> {
  const res = await fetch(`${LEGACY_API_BASE}/team/direction-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  return parseLegacyResponse<TeamDirectionRefreshData>(res)
}

export async function postMarketRefresh(
  body: PostMarketRefreshBody,
): Promise<LegacyApiResponse<MarketRefreshData>> {
  const res = await fetch(`${LEGACY_API_BASE}/market/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  return parseLegacyResponse<MarketRefreshData>(res)
}
